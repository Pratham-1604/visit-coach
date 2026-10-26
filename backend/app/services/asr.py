"""Speech-to-text for CRP voice notes, via Sarvam AI (DECISIONS.md #5).

Each note is at most 30 s, which fits Sarvam's REST endpoint (DECISIONS.md #8).
Docs: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
"""

from pathlib import Path

import httpx

from app import config

SARVAM_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_MODEL = "saaras:v3"

LANGUAGE_CODES = {"mr": "mr-IN", "hi": "hi-IN", "ta": "ta-IN", "en": "en-IN"}


class ASRError(Exception):
    """A voice note could not be transcribed."""


def transcribe(audio_path, language, mime="audio/webm"):
    """Return the transcript of one audio file. `language` is the school's code ('mr', 'hi', 'ta')."""
    if not config.SARVAM_API_KEY:
        raise ASRError("SARVAM_API_KEY is not set (add it to the repo-root .env)")

    path = Path(audio_path)
    try:
        response = httpx.post(
            SARVAM_URL,
            headers={"api-subscription-key": config.SARVAM_API_KEY},
            data={"model": SARVAM_MODEL, "language_code": LANGUAGE_CODES.get(language, "unknown")},
            files={"file": (path.name, path.read_bytes(), mime)},
            timeout=60,
        )
    except httpx.HTTPError as err:
        raise ASRError(f"Could not reach Sarvam: {err}") from err

    if response.status_code != 200:
        raise ASRError(f"Sarvam error {response.status_code}: {response.text[:300]}")
    return response.json().get("transcript", "").strip()
