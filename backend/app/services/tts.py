"""Text-to-speech for the teacher's notes, via Sarvam AI (Bulbul), so a teacher can listen instead of read.

Docs: https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert
"""

import base64

import httpx

from app import config
from app.services.asr import LANGUAGE_CODES

SARVAM_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_MODEL = "bulbul:v3"
MAX_CHARS = 2400  # Sarvam allows 2500 characters per request on bulbul:v3


class TTSError(Exception):
    """The notes could not be turned into speech."""


def speak(text, language):
    """Return MP3 audio of `text`. Long text is sent in parts and the MP3s are joined."""
    if not config.SARVAM_API_KEY:
        raise TTSError("SARVAM_API_KEY is not set (add it to the repo-root .env)")
    return b"".join(speak_part(part, language) for part in split_text(text))


def speak_part(text, language):
    try:
        response = httpx.post(
            SARVAM_URL,
            headers={"api-subscription-key": config.SARVAM_API_KEY},
            json={
                "text": text,
                "language_code": LANGUAGE_CODES.get(language, "hi-IN"),
                "model": SARVAM_MODEL,
                "output_audio_codec": "mp3",
            },
            timeout=90,
        )
    except httpx.HTTPError as err:
        raise TTSError(f"Could not reach Sarvam: {err}") from err

    if response.status_code != 200:
        raise TTSError(f"Sarvam error {response.status_code}: {response.text[:300]}")
    return b"".join(base64.b64decode(audio) for audio in response.json().get("audios", []))


def split_text(text):
    """Paragraphs packed into parts of at most MAX_CHARS; a paragraph that is too long is cut at a space."""
    parts, current = [], ""
    for paragraph in text.split("\n\n"):
        while len(paragraph) > MAX_CHARS:
            cut = paragraph.rfind(" ", 0, MAX_CHARS)
            cut = cut if cut > 0 else MAX_CHARS
            parts.append(paragraph[:cut])
            paragraph = paragraph[cut:].strip()
        if current and len(current) + len(paragraph) + 2 > MAX_CHARS:
            parts.append(current)
            current = ""
        current = f"{current}\n\n{paragraph}" if current else paragraph
    if current:
        parts.append(current)
    return parts
