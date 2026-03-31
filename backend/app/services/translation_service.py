from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()


SUPPORTED_LANGUAGES = [
    "Hindi",
    "Konkani",
    "Kannada",
    "Dogri",
    "Bodo",
    "Urdu",
    "Tamil",
    "Kashmiri",
    "Assamese",
    "Bengali",
    "Marathi",
    "Sindhi",
    "Maithili",
    "Punjabi",
    "Malayalam",
    "Manipuri",
    "Telugu",
    "Sanskrit",
    "Nepali",
    "Santali",
    "Gujarati",
    "Odia",
]


class TranslationService:
    def translate_lines(self, lines: list[str], target_language: str) -> list[str]:
        if target_language.lower() == "english":
            return lines

        return lines

    async def translate_module_item(
        self,
        module_item: dict[str, Any],
        target_language: str,
        gemini_api_key: str = "",
    ) -> dict[str, Any]:
        if target_language.lower() == "english" or not gemini_api_key:
            return module_item

        prompt = (
            "Translate this learning module JSON into the requested language. "
            "Keep the same JSON shape, keys, numbers, and list lengths. "
            "Translate learner-facing strings only and return valid JSON only. "
            "Use natural, standard wording in the target language and script.\n"
            f"Target language: {target_language}\n"
            f"Module JSON: {json.dumps(module_item, ensure_ascii=False)}"
        )

        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                    params={"key": gemini_api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.15},
                    },
                )
                response.raise_for_status()
                raw_text = self._extract_gemini_text(response.json())
                parsed = self._extract_json_object(raw_text)
        except Exception:
            return module_item

        return parsed if isinstance(parsed, dict) and parsed else module_item

    def _extract_gemini_text(self, payload: dict[str, Any]) -> str:
        candidates = payload.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return ""
        return str(parts[0].get("text", ""))

    def _extract_json_object(self, raw_text: str) -> dict[str, Any]:
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


translation_service = TranslationService()
