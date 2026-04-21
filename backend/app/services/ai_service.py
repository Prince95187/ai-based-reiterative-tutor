from __future__ import annotations

import json
import logging
import re
from difflib import SequenceMatcher

import httpx

from app.core.config import get_settings
from app.schemas.tutor import GenerateModulesRequest, ModuleSchema, QuestionSchema, SlideSchema

settings = get_settings()
logger = logging.getLogger(__name__)


class AIService:
    EXPECTED_MODULE_COUNT = 5
    EXPECTED_SLIDES_PER_MODULE = 3
    EXPECTED_QUESTIONS_PER_MODULE = 2

    # ------------------------------------------------------------------ #
    #  Module generation                                                   #
    # ------------------------------------------------------------------ #

    async def generate_modules(
        self, payload: GenerateModulesRequest, provider_keys: dict[str, str] | None = None
    ) -> tuple[list[ModuleSchema], str]:
        """Return (modules, source) where source is 'ai' or 'fallback'."""
        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key
        openai_api_key = provider_keys.get("openai_api_key") or settings.openai_api_key

        if gemini_api_key:
            generated = await self._generate_with_gemini(payload, gemini_api_key)
            if generated:
                return generated, "gemini"

        if openai_api_key:
            generated = await self._generate_with_openai(payload, openai_api_key)
            if generated:
                return generated, "openai"

        return self._generate_fallback_modules(payload), "fallback"

    async def _generate_with_gemini(self, payload: GenerateModulesRequest, gemini_api_key: str) -> list[ModuleSchema]:
        language_instruction = (
            f"Generate ALL learner-facing content directly in {payload.language}. "
            f"Use the natural script and grammar of {payload.language}. "
            "Do NOT generate in English first. Write everything natively in the target language."
            if payload.language.lower() != "english"
            else "Generate content in English."
        )

        prompt = f"""
You are a subject-matter expert writing an educational course.
Topic: {payload.topic}
Learning style: {payload.learning_style}
Target language: {payload.language}

{language_instruction}

Return valid JSON with a top-level key "modules".
Create exactly 5 modules where each contains:
- title (string, in {payload.language})
- module_index (integer 1-5)
- slides: exactly 3 items, each with:
    - title (string — a specific sub-topic name, NOT "Slide 1" or "Introduction")
    - body: list of exactly 3 strings. Each string must be a FACTUAL SENTENCE that TEACHES something specific about {payload.topic}.
    - speaker_note (string, teacher guidance for this slide)
- questions: exactly 2 items, each with:
    - prompt (string, the question asked to the learner)
    - expected_answer (string, ideal answer description)
    - concept (string, topic concept being tested)
    - difficulty ("easy", "medium", or "hard")
- narration_text (string, short spoken introduction)
- xp_reward (integer, 40-80)

Module progression:
1. What is {payload.topic}? — Define it, explain its origin, and describe what it does.
2. How does {payload.topic} work? — Explain the internal process, components, or mechanism step by step.
3. {payload.topic} in the real world — Show concrete examples, applications, and case studies.
4. Common mistakes & deeper details — Cover misconceptions, edge cases, and advanced nuance.
5. Putting it all together — Synthesize everything and connect to broader context.

EXAMPLE OF GOOD SLIDE BODY (for topic "Photosynthesis"):
[
  "Photosynthesis is the process by which green plants convert sunlight, water, and carbon dioxide into glucose and oxygen.",
  "It occurs primarily in the chloroplasts of plant cells, where a green pigment called chlorophyll absorbs light energy.",
  "The overall chemical equation is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂."
]

EXAMPLE OF BAD SLIDE BODY (DO NOT DO THIS):
[
  "Learn the main idea of Photosynthesis in a narrative way.",
  "Connect Photosynthesis to everyday life and familiar examples.",
  "Build a clear mental model before exploring deeper details."
]

The BAD example talks ABOUT learning. The GOOD example teaches ACTUAL FACTS.
Every single bullet point you write MUST teach a specific fact, definition, process, or example about {payload.topic}.
NEVER write sentences like "learn the main idea", "explore this concept", "build understanding", or "connect to everyday life".
"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
        except httpx.HTTPStatusError as exc:
            logger.error("Gemini API HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return []
        except Exception as exc:
            logger.error("Gemini module generation failed: %s", exc)
            return []

        parsed = self._extract_json_object(raw_text)
        return self._build_modules_from_parsed(parsed, payload)

    async def _generate_with_openai(self, payload: GenerateModulesRequest, openai_api_key: str) -> list[ModuleSchema]:
        language_instruction = (
            f"Generate ALL content directly in {payload.language}. Use the native script."
            if payload.language.lower() != "english"
            else "Generate content in English."
        )

        prompt = f"""
You are a subject-matter expert. Create 5 teaching modules as JSON for: "{payload.topic}".
{language_instruction}
Learning style: {payload.learning_style}

Each module: title, module_index (1-5), slides (3 per module), questions (2 per module), narration_text, xp_reward.
Each slide: title, body (3 strings), speaker_note.
Each question: prompt, expected_answer, concept, difficulty.

Progression: Definition -> Mechanism -> Applications -> Edge Cases -> Synthesis.

RULE: Every bullet point in the slide body must be a SPECIFIC FACTUAL STATEMENT that teaches real knowledge about {payload.topic}.
NEVER write meta-sentences like "Learn the main idea" or "Connect to everyday life". 
Write sentences like "The mitochondria is the powerhouse of the cell, converting nutrients into ATP through cellular respiration."

Output JSON with a top-level key named "modules".
"""

        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.openai_model,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a subject-matter expert who writes factual, descriptive educational content. "
                                    "Every sentence you write must teach a real fact. Never describe the learning process itself."
                                ),
                            },
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                response.raise_for_status()
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.error("OpenAI module generation failed: %s", exc)
            return []

        parsed = self._extract_json_object(raw_text)
        return self._build_modules_from_parsed(parsed, payload)

    def _generate_fallback_modules(self, payload: GenerateModulesRequest) -> list[ModuleSchema]:
        topic = payload.topic

        module_configs = [
            {
                "title": f"What is {topic}?",
                "slides": [
                    {
                        "title": f"Defining {topic}",
                        "body": [
                            f"{topic} is a subject area that encompasses specific principles, processes, and real-world phenomena.",
                            f"The study of {topic} helps us understand how certain systems or ideas function at a fundamental level.",
                            f"To truly grasp {topic}, one must understand both its theoretical foundations and practical implications.",
                        ],
                    },
                    {
                        "title": f"The Origins of {topic}",
                        "body": [
                            f"{topic} emerged from centuries of observation, experimentation, and intellectual inquiry.",
                            f"Key pioneers in {topic} laid the groundwork by asking fundamental questions about the world around them.",
                            f"Today, {topic} continues to evolve as new discoveries refine and sometimes overturn older models.",
                        ],
                    },
                    {
                        "title": f"Why {topic} Matters",
                        "body": [
                            f"{topic} has direct impact on technology, medicine, industry, or daily life depending on its domain.",
                            f"Without an understanding of {topic}, many modern systems and innovations would not be possible.",
                            f"Mastering {topic} opens doors to deeper study in related fields and practical career applications.",
                        ],
                    },
                ],
            },
            {
                "title": f"How {topic} Works",
                "slides": [
                    {
                        "title": f"The Core Mechanism of {topic}",
                        "body": [
                            f"At its heart, {topic} operates through a series of defined steps, reactions, or logical rules.",
                            f"Each component in {topic} plays a specific role, contributing to the overall function of the system.",
                            f"Understanding the sequence of events in {topic} is essential for predicting outcomes accurately.",
                        ],
                    },
                    {
                        "title": f"Key Components and Terminology",
                        "body": [
                            f"Every field of {topic} has its own specialized vocabulary that describes its unique elements.",
                            f"These terms are not arbitrary — each one maps to a specific concept, structure, or measurement.",
                            f"Fluency in the language of {topic} is the first step toward deeper technical understanding.",
                        ],
                    },
                    {
                        "title": f"Inputs, Outputs, and Transformations",
                        "body": [
                            f"Most processes in {topic} involve taking certain inputs and transforming them into specific outputs.",
                            f"The conditions under which these transformations happen (temperature, time, context) matter enormously.",
                            f"Tracking what goes in and what comes out is how scientists and practitioners verify that {topic} works correctly.",
                        ],
                    },
                ],
            },
            {
                "title": f"{topic} in the Real World",
                "slides": [
                    {
                        "title": f"Everyday Examples of {topic}",
                        "body": [
                            f"You encounter the effects of {topic} more often than you might realize in your daily routine.",
                            f"From household products to global systems, {topic} underpins many things people take for granted.",
                            f"Recognizing {topic} in action sharpens your ability to think critically about the world.",
                        ],
                    },
                    {
                        "title": f"Industrial and Scientific Applications",
                        "body": [
                            f"Industries ranging from manufacturing to healthcare rely on principles of {topic} for their operations.",
                            f"Research in {topic} has led to breakthroughs that save lives, reduce costs, and improve efficiency.",
                            f"Scientists continue to push the boundaries of {topic}, exploring uncharted territory for new applications.",
                        ],
                    },
                    {
                        "title": f"Case Study: {topic} in Practice",
                        "body": [
                            f"A well-documented case study shows how {topic} was applied to solve a significant real-world challenge.",
                            f"The results demonstrated both the power and the limitations of current approaches within {topic}.",
                            f"This case study illustrates that theoretical knowledge of {topic} must be adapted to messy, real conditions.",
                        ],
                    },
                ],
            },
            {
                "title": f"Common Mistakes in {topic}",
                "slides": [
                    {
                        "title": f"Misconceptions About {topic}",
                        "body": [
                            f"One of the most common errors is confusing {topic} with a closely related but distinct concept.",
                            f"Another frequent mistake is oversimplifying the mechanism, ignoring critical intermediate steps.",
                            f"These misconceptions can lead to wrong conclusions and flawed applications in practice.",
                        ],
                    },
                    {
                        "title": f"Edge Cases and Exceptions",
                        "body": [
                            f"Not every rule in {topic} applies universally — there are important exceptions and boundary conditions.",
                            f"Edge cases often reveal deeper truths about {topic} that the basic model doesn't capture.",
                            f"Experts in {topic} distinguish themselves by their awareness of when standard rules break down.",
                        ],
                    },
                    {
                        "title": f"Debugging Your Understanding",
                        "body": [
                            f"If a prediction about {topic} fails, the first step is to re-examine the assumptions you started with.",
                            f"Cross-checking your reasoning against established data is the most reliable way to find errors.",
                            f"A mature understanding of {topic} includes knowing what you don't know and where uncertainty lies.",
                        ],
                    },
                ],
            },
            {
                "title": f"Mastering {topic}",
                "slides": [
                    {
                        "title": f"Connecting {topic} to the Bigger Picture",
                        "body": [
                            f"{topic} does not exist in isolation — it connects to many neighboring fields and disciplines.",
                            f"Seeing these connections helps you transfer knowledge from {topic} to solve problems in other areas.",
                            f"The most valuable insights often come from the intersection of {topic} with unexpected domains.",
                        ],
                    },
                    {
                        "title": f"Advanced Frontiers of {topic}",
                        "body": [
                            f"Cutting-edge research in {topic} is currently exploring questions that were unimaginable a decade ago.",
                            f"New tools and technologies are enabling deeper investigation into the most fundamental aspects of {topic}.",
                            f"The future of {topic} promises breakthroughs that could reshape entire industries and ways of thinking.",
                        ],
                    },
                    {
                        "title": f"Your Command of {topic}",
                        "body": [
                            f"By this point, you should be able to define {topic}, explain its mechanism, and cite real-world examples.",
                            f"You can now identify common mistakes and know when rules apply and when they don't.",
                            f"True mastery means being able to explain {topic} clearly to someone else and answer their follow-up questions.",
                        ],
                    },
                ],
            },
        ]

        modules: list[ModuleSchema] = []
        for index, config in enumerate(module_configs, start=1):
            slides = [
                SlideSchema(
                    title=slide_data["title"],
                    body=slide_data["body"],
                    speaker_note=f"Explain the factual content of {topic} directly. Avoid meta-talk about the learning process.",
                )
                for slide_data in config["slides"]
            ]
            questions = [
                QuestionSchema(
                    prompt=f"What is one specific fact or principle about {topic} covered in this module?",
                    expected_answer=f"The learner should state a concrete fact about {topic} from module {index}.",
                    concept=f"{topic} — factual recall",
                    difficulty="easy" if index <= 2 else "medium",
                ),
                QuestionSchema(
                    prompt=f"Give a concrete example that demonstrates how {topic} works in practice.",
                    expected_answer=f"A specific, real-world example showing the mechanism or effect of {topic}.",
                    concept=f"{topic} — applied understanding",
                    difficulty="medium" if index <= 3 else "hard",
                ),
            ]
            narration = f"Module {index}: {config['title']}. Let's explore the real substance of this topic."
            modules.append(
                ModuleSchema(
                    title=config["title"],
                    topic=topic,
                    language=payload.language,
                    learning_style=payload.learning_style,
                    module_index=index,
                    slides=slides,
                    narration_text=narration,
                    questions=questions,
                    xp_reward=35 + index * 10,
                )
            )

        return modules


    # ------------------------------------------------------------------ #
    #  Answer evaluation                                                   #
    # ------------------------------------------------------------------ #

    async def evaluate_answer(
        self,
        expected_answer: str,
        user_answer: str,
        concept: str,
        language: str = "English",
        provider_keys: dict[str, str] | None = None,
    ) -> dict:
        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key

        if gemini_api_key:
            evaluated = await self._evaluate_with_gemini(
                expected_answer, user_answer, concept, language, gemini_api_key
            )
            if evaluated:
                return evaluated

        return self._evaluate_fallback(expected_answer, user_answer, concept)

    async def _evaluate_with_gemini(
        self,
        expected_answer: str,
        user_answer: str,
        concept: str,
        language: str,
        gemini_api_key: str,
    ) -> dict:
        language_instruction = (
            f"Write 'explanation' and 'reteach_text' fields in {language} (native script)."
            if language.lower() != "english"
            else "Write all text fields in English."
        )

        prompt = f"""
Evaluate a learner answer for an adaptive tutor.

Concept: {concept}
Expected answer: {expected_answer}
User answer: {user_answer}

{language_instruction}

Return valid JSON with exactly these fields:
- correct: boolean
- confidence: number between 0.0 and 1.0
- explanation: short feedback string (in {language})
- next_action: one-line guidance for the learner (in {language})
- reteach_text: short re-explanation if incorrect (in {language})
- recommended_difficulty: "easy", "medium", or "hard"
- xp_awarded: integer (0-30)
"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json"},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
        except httpx.HTTPStatusError as exc:
            logger.error("Gemini evaluate HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return {}
        except Exception as exc:
            logger.error("Gemini evaluation failed: %s", exc)
            return {}

        parsed = self._extract_json_object(raw_text)
        if not parsed:
            return {}

        try:
            confidence = float(parsed.get("confidence", 0.5))
            xp_awarded = int(parsed.get("xp_awarded", 10))
            recommended_difficulty = str(parsed.get("recommended_difficulty", "medium")).lower()
            if recommended_difficulty not in {"easy", "medium", "hard"}:
                recommended_difficulty = "medium"
            return {
                "correct": bool(parsed.get("correct", False)),
                "confidence": max(0.0, min(0.99, confidence)),
                "explanation": str(parsed.get("explanation", "Here is your feedback.")),
                "next_action": str(parsed.get("next_action", "Continue learning.")),
                "reteach_text": str(parsed.get("reteach_text", f"Let's revisit {concept} one more time.")),
                "recommended_difficulty": recommended_difficulty,
                "xp_awarded": max(0, xp_awarded),
            }
        except Exception as exc:
            logger.error("Parsing Gemini evaluation response failed: %s", exc)
            return {}

    def _evaluate_fallback(self, expected_answer: str, user_answer: str, concept: str) -> dict:
        similarity = SequenceMatcher(None, expected_answer.lower(), user_answer.lower()).ratio()
        keyword_hits = sum(1 for word in concept.lower().split() if word in user_answer.lower())
        confidence = min(0.99, round((similarity * 0.6) + min(keyword_hits * 0.12, 0.35), 2))
        correct = confidence >= 0.55 or len(user_answer.split()) > 10

        if correct:
            return {
                "correct": True,
                "confidence": confidence,
                "explanation": "Strong effort. Your answer shows useful understanding of the concept.",
                "next_action": "Move to the next module or try a harder follow-up.",
                "reteach_text": f"Quick reinforcement: {concept} works best when you explain it with one simple example.",
                "recommended_difficulty": "medium" if confidence < 0.8 else "hard",
                "xp_awarded": 25 if confidence >= 0.8 else 15,
            }

        return {
            "correct": False,
            "confidence": confidence,
            "explanation": "You are close, but the answer needs a clearer core idea or example.",
            "next_action": "Review the reteach summary below, then try again.",
            "reteach_text": (
                f"Think of {concept} as a simple idea you can explain to a friend in one sentence, "
                "then attach one everyday example to make it concrete."
            ),
            "recommended_difficulty": "easy",
            "xp_awarded": 5,
        }

    # ------------------------------------------------------------------ #
    #  Coach Q&A                                                           #
    # ------------------------------------------------------------------ #

    async def ask_coach(
        self,
        language: str,
        module_title: str,
        slide_title: str,
        slide_body: list[str],
        question: str,
        provider_keys: dict[str, str] | None = None,
    ) -> str:
        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key
        if not gemini_api_key:
            return self._ask_coach_fallback(language, slide_body, question)

        body_lines = "\n".join(f"- {line}" for line in slide_body if line)
        prompt = f"""
You are a warm, concise AI tutor coach.
Reply in {language} using the natural script of that language.
Keep the answer focused on the current slide only.
Use at most 2 short paragraphs. Be encouraging and clear.

Module: {module_title}
Slide: {slide_title}
Slide content:
{body_lines}

Learner question: {question}
"""

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.35},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json()).strip()
        except httpx.HTTPStatusError as exc:
            logger.error("Gemini coach HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return self._ask_coach_fallback(language, slide_body, question)
        except Exception as exc:
            logger.error("Gemini coach failed: %s", exc)
            return self._ask_coach_fallback(language, slide_body, question)

        return raw_text or self._ask_coach_fallback(language, slide_body, question)

    def _ask_coach_fallback(self, language: str, slide_body: list[str], question: str) -> str:
        main_idea = slide_body[0] if slide_body else "the current concept"
        if language.lower() == "hindi":
            return (
                f"इस स्लाइड का मुख्य विचार है: {main_idea}। "
                f"आपके सवाल के लिए — पहले इस मुख्य बिंदु को समझें, फिर एक आसान उदाहरण से जोड़ें।"
            )
        return (
            f"Main idea from this slide: {main_idea}. "
            f"For your question, start from that core idea and connect it to one simple real-world example. "
            "Add a Gemini API key in the Key Vault for a full coach reply in your language."
        )

    # ------------------------------------------------------------------ #
    #  UI translation                                                      #
    # ------------------------------------------------------------------ #

    async def translate_ui_entries(
        self, language: str, entries: dict[str, str], provider_keys: dict[str, str] | None = None
    ) -> dict[str, str]:
        if language.lower() == "english":
            return entries

        provider_keys = provider_keys or {}
        gemini_api_key = provider_keys.get("gemini_api_key") or settings.gemini_api_key
        if not gemini_api_key:
            return entries

        prompt = (
            "Translate the values of this JSON object into the requested language. "
            "Keep the same keys, preserve placeholders like {name} or {count}, "
            "and return valid JSON only. Use natural wording in the target language and its standard script.\n"
            f"Target language: {language}\n"
            f"JSON: {json.dumps(entries, ensure_ascii=False)}"
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
                parsed = self._extract_json_object(raw_text)
        except Exception as exc:
            logger.error("UI translation failed: %s", exc)
            return entries

        return {key: str(parsed.get(key, value)) for key, value in entries.items()}

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    def _extract_gemini_text(self, payload: dict) -> str:
        candidates = payload.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return ""
        return str(parts[0].get("text", ""))

    def _extract_json_object(self, raw_text: str) -> dict:
        if not raw_text:
            return {}

        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if not match:
                return {}
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}

    def _build_modules_from_parsed(
        self,
        parsed: dict,
        payload: GenerateModulesRequest,
    ) -> list[ModuleSchema]:
        fallback_modules = self._generate_fallback_modules(payload)
        raw_items = parsed.get("modules", [])
        if not isinstance(raw_items, list):
            raw_items = []

        modules_by_index: dict[int, ModuleSchema] = {}
        for position, item in enumerate(raw_items, start=1):
            try:
                module_index = self._coerce_module_index(item.get("module_index"), position)
                if module_index in modules_by_index or module_index > self.EXPECTED_MODULE_COUNT:
                    continue
                fallback_module = fallback_modules[module_index - 1]
                modules_by_index[module_index] = self._build_module_schema(
                    item, payload, fallback_module, module_index
                )
            except Exception as exc:
                logger.warning("Skipping malformed module item at position %s: %s", position, exc)
                continue

        return [
            modules_by_index.get(index, fallback_modules[index - 1])
            for index in range(1, self.EXPECTED_MODULE_COUNT + 1)
        ]

    def _coerce_module_index(self, raw_value: object, fallback_index: int) -> int:
        try:
            index = int(raw_value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            index = fallback_index
        return max(1, index)

    def _build_module_schema(
        self,
        item: dict,
        payload: GenerateModulesRequest,
        fallback_module: ModuleSchema,
        module_index: int,
    ) -> ModuleSchema:
        slides = self._normalize_slides(item.get("slides"), fallback_module.slides)
        questions = self._normalize_questions(item.get("questions"), fallback_module.questions)
        title = self._clean_text(item.get("title"), fallback_module.title)
        narration_text = self._clean_text(item.get("narration_text"), fallback_module.narration_text)

        try:
            xp_reward = max(10, int(item.get("xp_reward", fallback_module.xp_reward)))
        except (TypeError, ValueError):
            xp_reward = fallback_module.xp_reward

        return ModuleSchema(
            title=title,
            topic=payload.topic,
            language=payload.language,
            learning_style=payload.learning_style,
            module_index=module_index,
            slides=slides,
            narration_text=narration_text,
            questions=questions,
            xp_reward=xp_reward,
        )

    def _normalize_slides(self, raw_slides: object, fallback_slides: list[SlideSchema]) -> list[SlideSchema]:
        raw_list = raw_slides if isinstance(raw_slides, list) else []
        slides: list[SlideSchema] = []

        for index in range(self.EXPECTED_SLIDES_PER_MODULE):
            fallback_slide = fallback_slides[index]
            raw_slide = raw_list[index] if index < len(raw_list) and isinstance(raw_list[index], dict) else {}
            raw_body = raw_slide.get("body")
            body_items = raw_body if isinstance(raw_body, list) else []
            body = [
                self._clean_text(
                    body_items[body_index] if body_index < len(body_items) else "",
                    fallback_slide.body[body_index] if body_index < len(fallback_slide.body) else "",
                )
                for body_index in range(len(fallback_slide.body))
            ]
            slides.append(
                SlideSchema(
                    title=self._clean_text(raw_slide.get("title"), fallback_slide.title),
                    body=body,
                    speaker_note=self._clean_text(raw_slide.get("speaker_note"), fallback_slide.speaker_note),
                )
            )

        return slides

    def _normalize_questions(
        self,
        raw_questions: object,
        fallback_questions: list[QuestionSchema],
    ) -> list[QuestionSchema]:
        raw_list = raw_questions if isinstance(raw_questions, list) else []
        questions: list[QuestionSchema] = []

        for index in range(self.EXPECTED_QUESTIONS_PER_MODULE):
            fallback_question = fallback_questions[index]
            raw_question = raw_list[index] if index < len(raw_list) and isinstance(raw_list[index], dict) else {}
            difficulty = str(raw_question.get("difficulty", fallback_question.difficulty)).lower()
            if difficulty not in {"easy", "medium", "hard"}:
                difficulty = fallback_question.difficulty

            questions.append(
                QuestionSchema(
                    prompt=self._clean_text(raw_question.get("prompt"), fallback_question.prompt),
                    expected_answer=self._clean_text(
                        raw_question.get("expected_answer"),
                        fallback_question.expected_answer,
                    ),
                    concept=self._clean_text(raw_question.get("concept"), fallback_question.concept),
                    difficulty=difficulty,
                )
            )

        return questions

    def _clean_text(self, value: object, fallback: str) -> str:
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned:
                return cleaned
        return fallback


ai_service = AIService()
