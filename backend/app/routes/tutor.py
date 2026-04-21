from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.module import LearningModule
from app.models.progress import ProgressRecord
from app.models.user import User
from app.routes.dependencies import get_current_user
from app.schemas.tutor import (
    AskCoachRequest,
    AskCoachResponse,
    DashboardSummaryResponse,
    EvaluationRequest,
    EvaluationResponse,
    GenerateModulesRequest,
    GenerateModulesResponse,
    ModuleSchema,
    TranscriptionResponse,
    UiTranslationsRequest,
    UiTranslationsResponse,
)
from app.services.ai_service import ai_service
from app.services.speech_service import speech_service
from app.services.translation_service import SUPPORTED_LANGUAGES
from app.services.tutor_service import tutor_service

router = APIRouter(tags=["tutor"])


def provider_keys_from_request(request: Request) -> dict[str, str]:
    return {
        "gemini_api_key": request.headers.get("x-gemini-api-key", "").strip(),
        "openai_api_key": request.headers.get("x-openai-api-key", "").strip(),
        "google_translate_api_key": request.headers.get("x-google-translate-api-key", "").strip(),
        "elevenlabs_api_key": request.headers.get("x-elevenlabs-api-key", "").strip(),
    }


@router.get("/supported-languages")
def supported_languages() -> dict[str, list[str]]:
    return {"languages": SUPPORTED_LANGUAGES}


@router.post("/translate-ui", response_model=UiTranslationsResponse)
async def translate_ui(
    payload: UiTranslationsRequest,
    request: Request,
) -> UiTranslationsResponse:
    translations = await ai_service.translate_ui_entries(
        payload.language,
        payload.entries,
        provider_keys=provider_keys_from_request(request),
    )
    return UiTranslationsResponse(language=payload.language, translations=translations)


@router.post("/ask-coach", response_model=AskCoachResponse)
async def ask_coach(
    payload: AskCoachRequest,
    request: Request,
) -> AskCoachResponse:
    answer = await ai_service.ask_coach(
        language=payload.language,
        module_title=payload.module_title,
        slide_title=payload.slide_title,
        slide_body=payload.slide_body,
        question=payload.question,
        provider_keys=provider_keys_from_request(request),
    )
    return AskCoachResponse(answer=answer)


@router.post("/generate-modules", response_model=GenerateModulesResponse)
async def generate_modules(
    payload: GenerateModulesRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateModulesResponse:
    persisted, source = await tutor_service.generate_and_store_modules(
        db, current_user, payload, provider_keys=provider_keys_from_request(request)
    )
    modules = [
        ModuleSchema(
            id=module.id,
            title=module.title,
            topic=module.topic,
            language=module.language,
            learning_style=module.learning_style,
            module_index=module.module_index,
            slides=module.content,
            narration_text=module.narration_text,
            questions=module.questions,
            xp_reward=module.xp_reward,
        )
        for module in persisted
    ]
    return GenerateModulesResponse(
        topic=payload.topic,
        language=payload.language,
        learning_style=payload.learning_style,
        modules=modules,
        generation_source=source,
    )


@router.post("/evaluate-answer", response_model=EvaluationResponse)
async def evaluate_answer(
    payload: EvaluationRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluationResponse:
    module = db.scalar(
        select(LearningModule).where(LearningModule.id == payload.module_id, LearningModule.user_id == current_user.id)
    )
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    progress = db.scalar(
        select(ProgressRecord).where(
            ProgressRecord.module_id == payload.module_id,
            ProgressRecord.user_id == current_user.id,
        )
    )
    if not progress:
        progress = ProgressRecord(module_id=payload.module_id, user_id=current_user.id, status="ready")
        db.add(progress)
        db.flush()

    evaluation = await ai_service.evaluate_answer(
        expected_answer=payload.question.expected_answer,
        user_answer=payload.user_answer,
        concept=payload.question.concept,
        language=module.language,
        provider_keys=provider_keys_from_request(request),
    )

    is_last_question = payload.question_index >= payload.question_count - 1
    progress.attempts += 1
    progress.status = (
        "completed" if evaluation["correct"] and is_last_question
        else "ready" if evaluation["correct"]
        else "needs_review"
    )
    progress.score = round(evaluation["confidence"] * 100, 2)
    progress.xp_earned += evaluation["xp_awarded"]

    history = list(progress.answer_history or [])
    history.append(
        {
            "question_index": payload.question_index,
            "question": payload.question.prompt,
            "answer": payload.user_answer,
            "correct": evaluation["correct"],
            "confidence": evaluation["confidence"],
        }
    )
    progress.answer_history = history

    if not evaluation["correct"]:
        weak_concepts = set(progress.weak_concepts or [])
        weak_concepts.add(payload.question.concept)
        progress.weak_concepts = sorted(weak_concepts)
    else:
        progress.weak_concepts = [
            concept for concept in list(progress.weak_concepts or []) if concept != payload.question.concept
        ]

    db.commit()

    return EvaluationResponse(**evaluation)


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardSummaryResponse:
    return tutor_service.build_dashboard_summary(db, current_user)


@router.get("/topics")
def list_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[str]:
    return tutor_service.list_topics(db, current_user)


@router.get("/topic/{topic_name}", response_model=GenerateModulesResponse)
def get_topic_modules(
    topic_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateModulesResponse:
    persisted = tutor_service.get_topic_modules(db, current_user, topic_name)
    if not persisted:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    first = persisted[0]
    modules = [
        ModuleSchema(
            id=module.id,
            title=module.title,
            topic=module.topic,
            language=module.language,
            learning_style=module.learning_style,
            module_index=module.module_index,
            slides=module.content,
            narration_text=module.narration_text,
            questions=module.questions,
            xp_reward=module.xp_reward,
        )
        for module in persisted
    ]
    return GenerateModulesResponse(
        topic=topic_name,
        language=first.language,
        learning_style=first.learning_style,
        modules=modules,
        generation_source="database",
    )


@router.post("/transcribe-audio", response_model=TranscriptionResponse)
async def transcribe_audio(
    language: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> TranscriptionResponse:
    transcript, provider = await speech_service.transcribe(
        file,
        language,
        openai_api_key=provider_keys_from_request(request).get("openai_api_key", ""),
    )
    return TranscriptionResponse(transcript=transcript, language=language, provider=provider)
