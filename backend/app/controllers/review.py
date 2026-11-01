"""'Did I miss anything?' check, run from the phone just before the mentor ends a visit (needs internet)."""

from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.controllers.checklists import active_checklist, checklist_by_id
from app.services import llm, review
from app.services.packet import covers


class ReviewIn(BaseModel):
    checklist_id: int | None = None
    rubric: dict[str, Literal["yes", "partly", "no"]] = {}
    typed_note: str = Field(default="", max_length=20000)
    grade: int = 1
    subject: Literal["literacy", "numeracy", "both"] = "both"
    language: Literal["en", "mr", "hi"] = "en"  # the mentor's screen language: the answer comes back in it


def review_visit(review_in, user):
    checklist = checklist_by_id(review_in.checklist_id) if review_in.checklist_id else active_checklist(user["state"])
    items = {
        item["id"]: item
        for item in checklist["items"]
        if covers(review_in.subject, item)
    }
    try:
        return review.review_visit(
            items, review_in.rubric, review_in.typed_note, review_in.grade, review_in.subject, review_in.language
        )
    except llm.LLMError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err
