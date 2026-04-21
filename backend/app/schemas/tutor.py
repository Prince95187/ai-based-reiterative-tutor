from typing import Literal

from pydantic import BaseModel, Field


LearningStyle = Literal["Normal", "Storytelling", "Creative", "Explain like a 5-year-old"]


class SlideSchema(BaseModel):
    title: str
    body: list[str]
    speaker_note: str


class QuestionSchema(BaseModel):
    prompt: str
    expected_answer: str
    concept: str
    difficulty: str


class ModuleSchema(BaseModel):
    id: int | None = None
    title: str
    topic: str
    language: str
    learning_style: LearningStyle
    module_index: int
    slides: list[SlideSchema]
    narration_text: str
    questions: list[QuestionSchema]
    xp_reward: int = 40


class GenerateModulesRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    language: str = Field(min_length=2, max_length=80)
    learning_style: LearningStyle


class GenerateModulesResponse(BaseModel):
    topic: str
    language: str
    learning_style: LearningStyle
    modules: list[ModuleSchema]
    generation_source: str = "ai"  # "gemini" | "openai" | "fallback"


class EvaluationRequest(BaseModel):
    module_id: int
    question: QuestionSchema
    question_index: int = Field(ge=0, default=0)
    question_count: int = Field(ge=1, default=1)
    user_answer: str = Field(min_length=1, max_length=1000)


class EvaluationResponse(BaseModel):
    correct: bool
    confidence: float
    explanation: str
    next_action: str
    reteach_text: str
    recommended_difficulty: str
    xp_awarded: int


class ModuleProgressSchema(BaseModel):
    module_id: int
    title: str
    topic: str
    status: str
    score: float
    attempts: int
    xp_earned: int
    weak_concepts: list[str]


class DashboardSummaryResponse(BaseModel):
    learner_name: str
    preferred_language: str
    completed_modules: int
    total_modules: int
    overall_progress: float
    total_xp: int
    weak_areas: list[str]
    modules: list[ModuleProgressSchema]


class TranscriptionResponse(BaseModel):
    transcript: str
    language: str
    provider: str


class UiTranslationsRequest(BaseModel):
    language: str = Field(min_length=2, max_length=80)
    entries: dict[str, str]


class UiTranslationsResponse(BaseModel):
    language: str
    translations: dict[str, str]


class AskCoachRequest(BaseModel):
    language: str = Field(min_length=2, max_length=80)
    module_title: str = Field(min_length=2, max_length=200)
    slide_title: str = Field(min_length=2, max_length=200)
    slide_body: list[str] = Field(min_length=1)
    question: str = Field(min_length=1, max_length=800)


class AskCoachResponse(BaseModel):
    answer: str
