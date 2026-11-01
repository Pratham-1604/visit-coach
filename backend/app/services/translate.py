"""The teacher's notes in English, for a teacher who asks to read them in English. Claude translates; nothing is added."""

import json

from pydantic import BaseModel

from app.services import llm

LANGUAGE_NAMES = {"mr": "Marathi", "hi": "Hindi", "ta": "Tamil", "en": "English"}

INSTRUCTIONS = """You translate a primary school teacher's coaching notes into plain, simple Indian English.
Translate faithfully: don't add, drop, soften or explain anything. Keep names, numbers and classroom words as they are.
Lists stay lists, with the same number of items in the same order. If a part is already in English, keep it as it is."""


class EnglishNotes(BaseModel):
    strength: str
    priority: str
    practice_steps: list[str]
    materials: list[str]
    follow_up: str
    follow_up_check: str


def to_english(notes, language):
    """`notes` holds the EnglishNotes fields in the teacher's language. Returns the same fields in English."""
    user = f"Translate these notes from {LANGUAGE_NAMES.get(language, language)} into English:\n\n" + json.dumps(
        notes, ensure_ascii=False, indent=2
    )
    english, _usage = llm.parse(INSTRUCTIONS, user, EnglishNotes, effort="low", max_tokens=4000)
    return english.model_dump()
