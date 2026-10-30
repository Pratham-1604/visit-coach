"""A teacher's coaching history: every approved visit, who visited, what was agreed and whether it happened.

Teachers get different mentors over time, so feedback breaks off (MENTOR.md #6). The history
lets the next mentor pick up where the last one left off, and lets the teacher keep track too.
"""

import json

from app import db
from app.services import knowledge

RESULTS = {"done": "done", "partly": "partly done", "not_done": "not done"}


def teacher_history(teacher_id):
    """Approved visits for this teacher, newest first. Only what the mentor and the teacher may both see."""
    rows = db.query(
        "SELECT v.id AS visit_id, v.mentor_name, v.subject, v.language, p.edited_json, p.original_json,"
        " p.approved_at, f.status AS result, f.note AS result_note"
        " FROM visits v JOIN packets p ON p.visit_id = v.id"
        " LEFT JOIN followups f ON f.visit_id = v.id"
        " WHERE v.teacher_id = ? AND v.status = 'approved'"
        " ORDER BY p.approved_at DESC, v.id DESC",
        (teacher_id,),
    )
    items = knowledge.rubric_items()
    history = []
    for row in rows:
        packet = json.loads(row["edited_json"] or row["original_json"])
        item = items.get(packet.get("priority_rubric_item"))
        history.append(
            {
                "visit_id": row["visit_id"],
                "date": row["approved_at"],
                "mentor_name": row["mentor_name"],
                "subject": row["subject"],
                "focus": item["text"].get(row["language"], item["text"]["en"]) if item else None,
                "focus_en": item["text"]["en"] if item else None,
                "follow_up": packet.get("follow_up"),
                "result": row["result"],  # done | partly | not_done | None (not checked yet)
                "result_note": row["result_note"] or "",
            }
        )
    return history


def previous_actions(teacher_id, before_visit_id, limit=3):
    """The last few agreed actions and what later mentors found, for Claude to build on. Newest first."""
    lines = []
    for entry in teacher_history(teacher_id):
        if entry["visit_id"] >= before_visit_id or not entry["follow_up"]:
            continue
        who = f"mentor {entry['mentor_name']}" if entry["mentor_name"] else "an earlier mentor"
        if entry["result"]:
            found = RESULTS[entry["result"]] + (f"; {entry['result_note']}" if entry["result_note"] else "")
        else:
            found = "not checked yet"
        focus = f" [focus: {entry['focus_en']}]" if entry["focus_en"] else ""
        lines.append(f"{entry['date'][:10]}, {who}{focus}: {entry['follow_up']} (result: {found})")
        if len(lines) == limit:
            break
    return lines
