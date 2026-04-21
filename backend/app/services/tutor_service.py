from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.module import LearningModule
from app.models.progress import ProgressRecord
from app.models.user import User
from app.schemas.tutor import DashboardSummaryResponse, GenerateModulesRequest, ModuleProgressSchema
from app.services.ai_service import ai_service


class TutorService:
    async def generate_and_store_modules(
        self,
        db: Session,
        user: User,
        payload: GenerateModulesRequest,
        provider_keys: dict[str, str] | None = None,
    ) -> tuple[list[LearningModule], str]:
        generated_modules, source = await ai_service.generate_modules(payload, provider_keys=provider_keys)

        # Only delete existing modules and progress for the SAME topic
        existing_modules = db.scalars(
            select(LearningModule).where(
                LearningModule.user_id == user.id, 
                LearningModule.topic == payload.topic
            )
        ).all()
        
        if existing_modules:
            existing_ids = [m.id for m in existing_modules]
            existing_progress = db.scalars(
                select(ProgressRecord).where(
                    ProgressRecord.user_id == user.id,
                    ProgressRecord.module_id.in_(existing_ids)
                )
            ).all()
            for record in existing_progress:
                db.delete(record)
            for module in existing_modules:
                db.delete(module)
            db.flush()

        persisted: list[LearningModule] = []
        for module_schema in generated_modules:
            module = LearningModule(
                topic=module_schema.topic,
                title=module_schema.title,
                language=module_schema.language,
                learning_style=module_schema.learning_style,
                module_index=module_schema.module_index,
                content=[slide.model_dump() for slide in module_schema.slides],
                questions=[question.model_dump() for question in module_schema.questions],
                narration_text=module_schema.narration_text,
                xp_reward=module_schema.xp_reward,
                user_id=user.id,
            )
            db.add(module)
            db.flush()
            db.add(
                ProgressRecord(
                    module_id=module.id,
                    user_id=user.id,
                    status="ready",
                    score=0.0,
                    attempts=0,
                    xp_earned=0,
                    weak_concepts=[],
                    answer_history=[],
                )
            )
            persisted.append(module)

        db.commit()
        for module in persisted:
            db.refresh(module)
        return persisted, source

    def list_topics(self, db: Session, user: User) -> list[str]:
        topics = db.scalars(
            select(LearningModule.topic)
            .where(LearningModule.user_id == user.id)
            .distinct()
        ).all()
        return list(topics)

    def get_topic_modules(self, db: Session, user: User, topic: str) -> list[LearningModule]:
        return db.scalars(
            select(LearningModule)
            .where(LearningModule.user_id == user.id, LearningModule.topic == topic)
            .order_by(LearningModule.module_index)
        ).all()

    def build_dashboard_summary(self, db: Session, user: User) -> DashboardSummaryResponse:
        modules = db.scalars(
            select(LearningModule).where(LearningModule.user_id == user.id).order_by(LearningModule.module_index)
        ).all()
        progress_records = db.scalars(
            select(ProgressRecord).where(ProgressRecord.user_id == user.id).order_by(ProgressRecord.module_id)
        ).all()

        progress_by_module = {record.module_id: record for record in progress_records}
        module_rows: list[ModuleProgressSchema] = []
        weak_areas: list[str] = []
        total_xp = 0
        completed = 0

        for module in modules:
            progress = progress_by_module.get(module.id)
            if not progress:
                continue
            if progress.status == "completed":
                completed += 1
            total_xp += progress.xp_earned
            weak_areas.extend(progress.weak_concepts)
            module_rows.append(
                ModuleProgressSchema(
                    module_id=module.id,
                    title=module.title,
                    topic=module.topic,
                    status=progress.status,
                    score=progress.score,
                    attempts=progress.attempts,
                    xp_earned=progress.xp_earned,
                    weak_concepts=progress.weak_concepts,
                )
            )

        total_modules = len(module_rows)
        overall_progress = round((completed / total_modules) * 100, 2) if total_modules else 0.0

        return DashboardSummaryResponse(
            learner_name=user.name,
            preferred_language=user.language,
            completed_modules=completed,
            total_modules=total_modules,
            overall_progress=overall_progress,
            total_xp=total_xp,
            weak_areas=sorted(set(weak_areas)),
            modules=module_rows,
        )


tutor_service = TutorService()
