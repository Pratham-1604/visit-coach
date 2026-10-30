"""The teacher's view of an approved packet, opened from the link the CRP shares.

Only the parts written for the teacher leave the server: no transcripts, evidence,
sources or English summary for the CRP (DECISIONS.md #10, #19).
"""

import json

from fastapi import HTTPException

from app import db
from app.controllers.history import teacher_history
from app.services.packet import TEACHER_FIELDS

# The parts of the history the teacher sees: no notes the mentor wrote at the check.
HISTORY_FIELDS = ("date", "mentor_name", "focus", "follow_up", "result")


def get_shared_packet(token):
    row = db.query_one(
        "SELECT p.edited_json, p.original_json, p.approved_at, v.id AS visit_id, v.teacher_id, v.mentor_name,"
        " v.language, t.name AS teacher_name,"
        " t.grade, s.name AS school_name"
        " FROM packets p JOIN visits v ON v.id = p.visit_id"
        " JOIN teachers t ON t.id = v.teacher_id JOIN schools s ON s.id = v.school_id"
        " WHERE p.share_token = ? AND p.approved_at IS NOT NULL",
        (token,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="This link is not valid")

    packet = json.loads(row["edited_json"] or row["original_json"])
    earlier = [
        {field: entry[field] for field in HISTORY_FIELDS}
        for entry in teacher_history(row["teacher_id"])
        if entry["visit_id"] < row["visit_id"]
    ]
    return {
        "school_name": row["school_name"],
        "teacher_first_name": row["teacher_name"].split()[0],
        "grade": row["grade"],
        "language": row["language"],
        "approved_at": row["approved_at"],
        "mentor_name": row["mentor_name"],
        "packet": {field: packet.get(field) for field in TEACHER_FIELDS},
        "history": earlier,
    }
