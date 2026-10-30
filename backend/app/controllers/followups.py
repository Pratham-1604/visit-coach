"""Follow-up: at the next visit, the CRP checks whether the agreed action happened.

One answer per approved visit. Sending it again (e.g. a retry from the phone's outbox,
or the CRP changing their mind) replaces the earlier answer.
"""

import json
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app import db


class FollowUpIn(BaseModel):
    status: Literal["done", "partly", "not_done"]
    note: str = ""
    teacher_rating: int | None = Field(default=None, ge=1, le=5)


def record_followup(visit_id, followup):
    visit = db.query_one("SELECT status FROM visits WHERE id = ?", (visit_id,))
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit["status"] != "approved":
        raise HTTPException(status_code=409, detail="Only an approved visit has an action to follow up")

    db.execute(
        "INSERT INTO followups (visit_id, status, note, teacher_rating) VALUES (?, ?, ?, ?)"
        " ON CONFLICT(visit_id) DO UPDATE SET status = excluded.status, note = excluded.note,"
        " teacher_rating = excluded.teacher_rating, checked_at = CURRENT_TIMESTAMP",
        (visit_id, followup.status, followup.note.strip(), followup.teacher_rating),
    )
    return db.query_one("SELECT * FROM followups WHERE visit_id = ?", (visit_id,))


def open_followups(school_id):
    """For each teacher at the school: their latest approved visit, if its action hasn't been checked yet.

    Only the latest visit counts. Older unchecked actions are out of date once a newer packet exists.
    """
    rows = db.query(
        "SELECT v.id AS visit_id, v.teacher_id, p.edited_json, p.original_json, p.approved_at,"
        " f.id AS followup_id"
        " FROM visits v JOIN packets p ON p.visit_id = v.id"
        " LEFT JOIN followups f ON f.visit_id = v.id"
        " WHERE v.school_id = ? AND v.status = 'approved'"
        " ORDER BY p.approved_at DESC, v.id DESC",
        (school_id,),
    )
    latest, seen = {}, set()
    for row in rows:
        if row["teacher_id"] in seen:
            continue
        seen.add(row["teacher_id"])
        if row["followup_id"]:
            continue
        packet = json.loads(row["edited_json"] or row["original_json"])
        latest[row["teacher_id"]] = {
            "visit_id": row["visit_id"],
            "teacher_id": row["teacher_id"],
            "follow_up": packet.get("follow_up"),
            "follow_up_check": packet.get("follow_up_check"),
            "approved_at": row["approved_at"],
        }
    return list(latest.values())
