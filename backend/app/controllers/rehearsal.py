"""Rehearsal logic: find the visit's packet, check the conversation, ask Claude."""

import json
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel

from app import db
from app.services import llm, rehearsal


class Line(BaseModel):
    role: Literal["crp", "teacher"]
    text: str


class RehearsalIn(BaseModel):
    history: list[Line] = []


def take_turn(visit_id, body):
    visit, packet, history = prepare(visit_id, body)
    try:
        reply = rehearsal.teacher_reply(packet, visit["language"], visit["grade"], first_name(visit), history)
    except llm.LLMError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err
    return {"reply": reply}


def score(visit_id, body):
    visit, packet, history = prepare(visit_id, body)
    if not any(line["role"] == "crp" for line in history):
        raise HTTPException(status_code=400, detail="Say something to the teacher first")
    try:
        return rehearsal.score_rehearsal(packet, visit["language"], first_name(visit), history)
    except llm.LLMError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err


def prepare(visit_id, body):
    visit = db.query_one(
        "SELECT v.status, v.language, t.name AS teacher_name, t.grade, p.original_json, p.edited_json"
        " FROM visits v JOIN teachers t ON t.id = v.teacher_id LEFT JOIN packets p ON p.visit_id = v.id"
        " WHERE v.id = ?",
        (visit_id,),
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit["status"] not in ("ready", "approved") or not visit["original_json"]:
        raise HTTPException(status_code=409, detail="Rehearse once the coaching packet is ready")

    history = [line.model_dump() for line in body.history if line.text.strip()]
    if len(history) > rehearsal.MAX_TURNS:
        raise HTTPException(status_code=400, detail="This rehearsal is long enough: end it to get feedback")
    return visit, json.loads(visit["edited_json"] or visit["original_json"]), history


def first_name(visit):
    return visit["teacher_name"].split()[0]
