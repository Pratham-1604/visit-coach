"""Each state's observation checklist: the version in use, its history, and uploading a new version.

The state admin (e.g. SCERT) uploads a new version as CSV or JSON. Mentors always get the newest
version of their state; visits keep the version they were observed with.
"""

import json

from fastapi import HTTPException

from app import db
from app.services import knowledge
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
