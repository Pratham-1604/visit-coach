"""Visit reports: write (with Claude), read, and mark as sent.

The report stays with the mentor: it is sent where the state's process says (WhatsApp, a printed or PDF
copy). The block officer's page still sees only counts (DECISIONS.md #10).
"""

import json
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel

from app import db
from app.controllers.checklists import items_for_visit
from app.controllers.history import previous_actions
from app.services import llm, report


class ReportIn(BaseModel):
    language: Literal["en", "mr", "hi"] = "en"  # the mentor's screen language


def report_view(visit_id):
    """Everything the report page shows: the facts from the data, plus Claude's report if written."""
    visit = load_visit(visit_id)
    items = items_for_visit(visit)
    row = db.query_one("SELECT * FROM reports WHERE visit_id = ?", (visit_id,))
    packet = db.query_one("SELECT original_json, edited_json FROM packets WHERE visit_id = ?", (visit_id,))
    current = json.loads(packet["edited_json"] or packet["original_json"]) if packet else {}
    checklist = db.query_one("SELECT name, version FROM checklists WHERE id = ?", (visit.get("checklist_id"),)) or {}

    return {
        "visit": {
            key: visit[key]
            for key in ("id", "status", "school_name", "teacher_name", "grade", "subject", "language", "mentor_name",
                        "observed_at", "children_present", "grades_together")
        },
        "checklist": {"name": checklist.get("name"), "version": checklist.get("version", 1), "items": list(items.values())},
        "rubric": visit["rubric"],
        "follow_up": current.get("follow_up"),
        "report": json.loads(row["report_json"]) if row else None,
        "language": row["language"] if row else None,
        "sent_at": row["sent_at"] if row else None,
    }


def write_report(visit_id, report_in):
    visit = load_visit(visit_id)
    if visit["status"] not in ("ready", "approved"):
        raise HTTPException(status_code=409, detail="The visit is still being processed")

    notes = [note["transcript"] for note in db.query(
        "SELECT transcript FROM voice_notes WHERE visit_id = ? ORDER BY id", (visit_id,)
    ) if note["transcript"]]
    if visit["typed_note"]:
        notes.append(visit["typed_note"])
    packet = db.query_one("SELECT original_json, edited_json FROM packets WHERE visit_id = ?", (visit_id,))
    follow_up = json.loads(packet["edited_json"] or packet["original_json"]).get("follow_up") if packet else None

    try:
        written = report.write_report(
            visit,
            items_for_visit(visit),
            visit["rubric"],
            notes,
            follow_up,
            previous_actions(visit["teacher_id"], visit_id),
            report_in.language,
        )
    except llm.LLMError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    # Writing again (e.g. in another language) replaces the report; it has to be sent again too.
    db.execute(
        "INSERT INTO reports (visit_id, language, report_json) VALUES (?, ?, ?)"
        " ON CONFLICT(visit_id) DO UPDATE SET language = excluded.language, report_json = excluded.report_json,"
        " created_at = CURRENT_TIMESTAMP, sent_at = NULL",
        (visit_id, report_in.language, json.dumps(written, ensure_ascii=False)),
    )
    return report_view(visit_id)


def mark_sent(visit_id):
    if not db.query_one("SELECT visit_id FROM reports WHERE visit_id = ?", (visit_id,)):
        raise HTTPException(status_code=409, detail="Write the report first")
    db.execute("UPDATE reports SET sent_at = CURRENT_TIMESTAMP WHERE visit_id = ?", (visit_id,))
    return report_view(visit_id)


def load_visit(visit_id):
    visit = db.query_one(
        "SELECT v.*, t.name AS teacher_name, t.grade, s.name AS school_name"
        " FROM visits v JOIN teachers t ON t.id = v.teacher_id JOIN schools s ON s.id = v.school_id WHERE v.id = ?",
        (visit_id,),
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    visit["rubric"] = json.loads(visit["rubric_json"] or "{}")
    visit["grades_together"] = json.loads(visit["grades_together"] or "[]")
    return visit
