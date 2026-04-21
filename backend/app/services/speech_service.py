from __future__ import annotations

import logging

import httpx
from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Whisper uses ISO 639-1 language codes (empty string = auto-detect)
_LANGUAGE_CODES: dict[str, str] = {
    "english": "en",
    "hindi": "hi",
    "bengali": "bn",
    "tamil": "ta",
    "telugu": "te",
    "marathi": "mr",
    "gujarati": "gu",
    "kannada": "kn",
    "malayalam": "ml",
    "punjabi": "pa",
    "odia": "or",
    "assamese": "as",
    "urdu": "ur",
    "nepali": "ne",
    "sanskrit": "sa",
    "maithili": "",
    "konkani": "",
    "dogri": "",
    "bodo": "",
    "kashmiri": "",
    "sindhi": "sd",
    "manipuri": "",
    "santali": "",
}


class SpeechService:
    async def transcribe(self, file: UploadFile, language: str, openai_api_key: str = "") -> tuple[str, str]:
        api_key = openai_api_key or settings.openai_api_key
        if not api_key:
            return (
                "Demo transcript: I understand the main idea, but I would like a simpler explanation with an example.",
                "demo-fallback",
            )

        audio_bytes = await file.read()
        lang_code = _LANGUAGE_CODES.get(language.lower(), "")

        form_data: dict = {
            "model": "whisper-1",
            "response_format": "text",
        }
        if lang_code:
            form_data["language"] = lang_code

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={
                        "file": (file.filename or "recording.webm", audio_bytes, "audio/webm")
                    },
                    data=form_data,
                )
                response.raise_for_status()
                transcript = response.text.strip()
                return (transcript or "No speech detected.", "openai-whisper")
        except httpx.HTTPStatusError as exc:
            logger.error("Whisper API HTTP error %s: %s", exc.response.status_code, exc.response.text)
            return (f"Transcription failed (HTTP {exc.response.status_code}).", "error")
        except Exception as exc:
            logger.error("Whisper transcription failed: %s", exc)
            return ("Transcription failed. Please type your answer instead.", "error")


speech_service = SpeechService()
