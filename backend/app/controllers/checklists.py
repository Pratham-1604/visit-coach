"""Each state's observation checklist: the version in use, its history, and uploading a new version.

The state admin (e.g. SCERT) uploads a new version as CSV or JSON. Mentors always get the newest
version of their state; visits keep the version they were observed with.
"""

import json

from fastapi import HTTPException

from app import db
from app.services import checklist_review, knowledge, llm
from app.services.checklist_file import ChecklistFileError, parse_checklist, to_csv

STATES = {"MH": "Maharashtra"}
ITEM_FIELDS = ("id", "subject", "need_area", "kpalp", "text", "look_for")


def seed_checklists_if_empty():
    """Version 1 for Maharashtra: our reading-and-maths items, each mapped to a KPALP indicator."""
    if db.query_one("SELECT id FROM checklists LIMIT 1"):
        return
    rubric = knowledge.rubric()
    items = [{key: item[key] for key in ITEM_FIELDS if key in item} for item in rubric["items"]]
    db.execute(
        "INSERT INTO checklists (state, version, name, items_json, note, uploaded_by) VALUES (?, 1, ?, ?, ?, ?)",
        (
            "MH",
            "Reading and maths add-on to KPALP classroom observation",
            json.dumps(items, ensure_ascii=False),
            "First version, from the KVS FLN checklist and NIPUN Bharat, mapped to KPALP indicators.",
            "VisitCoach",
        ),
    )


def active_checklist(state):
    row = db.query_one("SELECT * FROM checklists WHERE state = ? ORDER BY version DESC LIMIT 1", (state,))
    if not row:
        raise HTTPException(status_code=404, detail=f"No checklist for state {state}")
    return shaped(row)


def checklist_by_id(checklist_id):
    row = db.query_one("SELECT * FROM checklists WHERE id = ?", (checklist_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return shaped(row)


def items_for_visit(visit):
    """{item_id: item} for the checklist a visit was observed with (older visits: Maharashtra version 1)."""
    if visit.get("checklist_id"):
        checklist = checklist_by_id(visit["checklist_id"])
    else:
        row = db.query_one("SELECT * FROM checklists WHERE state = 'MH' ORDER BY version LIMIT 1")
        checklist = shaped(row)
    return {item["id"]: item for item in checklist["items"]}


def checklist_overview(state):
    """For the state admin: the version in use and every earlier version."""
    versions = db.query(
        "SELECT id, version, name, note, uploaded_by, created_at, items_json FROM checklists"
        " WHERE state = ? ORDER BY version DESC",
        (state,),
    )
    return {
        "state": state,
        "state_name": STATES.get(state, state),
        "active": active_checklist(state),
        "versions": [
            {**{k: v for k, v in row.items() if k != "items_json"}, "items_count": len(json.loads(row["items_json"]))}
            for row in versions
        ],
    }


def upload_checklist(state, filename, data, name, note, user):
    try:
        items = parse_checklist(filename, data, set(knowledge.need_areas()))
    except ChecklistFileError as err:
        raise HTTPException(status_code=422, detail={"problems": err.problems}) from err

    current = active_checklist(state)
    checklist_id = db.execute(
        "INSERT INTO checklists (state, version, name, items_json, note, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
        (
            state,
            current["version"] + 1,
            name.strip() or current["name"],
            json.dumps(items, ensure_ascii=False),
            note.strip(),
            user["name"],
        ),
    )
    return checklist_by_id(checklist_id)


def checklist_csv(checklist_id):
    return to_csv(checklist_by_id(checklist_id)["items"])


def shaped(row):
    """A checklist row as the app uses it, with the need areas (shared by every state) attached."""
    return {
        "id": row["id"],
        "state": row["state"],
        "state_name": STATES.get(row["state"], row["state"]),
        "version": row["version"],
        "name": row["name"],
        "note": row["note"],
        "uploaded_by": row["uploaded_by"],
        "created_at": row["created_at"],
        "need_areas": knowledge.rubric()["need_areas"],
        "items": json.loads(row["items_json"]),
    }


# Suggestions for the next version (the state admin's "what the visits say" section).


def checklist_insights(state):
    """Totals per item from the visits observed with the version in use, plus Claude's latest suggestions."""
    checklist = active_checklist(state)
    visits = visits_with(checklist)
    stats = checklist_review.item_stats(checklist["items"], visits)
    latest = db.query_one(
        "SELECT * FROM checklist_suggestions WHERE checklist_id = ? ORDER BY id DESC LIMIT 1", (checklist["id"],)
    )
    return {
        "checklist_id": checklist["id"],
        "version": checklist["version"],
        "visits": len(visits),
        "min_visits": checklist_review.MIN_VISITS,
        "items": stats,
        "suggestions": json.loads(latest["suggestions_json"]) if latest else None,
        "suggested_at": latest["created_at"] if latest else None,
    }


def suggest_items(state, language):
    checklist = active_checklist(state)
    visits = visits_with(checklist)
    stats = checklist_review.item_stats(checklist["items"], visits)
    notes = [visit["notes"] for visit in visits if visit["notes"].strip()]
    try:
        suggestions = checklist_review.suggest_new_items(
            checklist["items"], stats, notes, set(knowledge.need_areas()), language
        )
    except llm.LLMError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err
    db.execute(
        "INSERT INTO checklist_suggestions (checklist_id, language, suggestions_json) VALUES (?, ?, ?)",
        (checklist["id"], language, json.dumps(suggestions, ensure_ascii=False)),
    )
    return checklist_insights(state)


def suggested_csv(state):
    """The version in use plus the suggested new items: a starting point to edit and upload as the next version."""
    insights = checklist_insights(state)
    new_items = (insights["suggestions"] or {}).get("new_items", [])
    items = active_checklist(state)["items"] + [checklist_review.as_checklist_item(item) for item in new_items]
    return to_csv(items)


def visits_with(checklist):
    """Synced visits observed with this checklist version (demo history has no version: it counts as version 1)."""
    rows = db.query(
        "SELECT v.subject, v.rubric_json, v.typed_note,"
        " (SELECT group_concat(n.transcript, ' ') FROM voice_notes n WHERE n.visit_id = v.id) AS transcripts"
        " FROM visits v WHERE v.status IN ('ready', 'approved')"
        " AND (v.checklist_id = ? OR (v.checklist_id IS NULL AND ? = 1))",
        (checklist["id"], checklist["version"]),
    )
    return [
        {
            "subject": row["subject"],
            "rubric": json.loads(row["rubric_json"] or "{}"),
            "notes": " ".join(filter(None, [row["typed_note"], row["transcripts"]])),
        }
        for row in rows
    ]
