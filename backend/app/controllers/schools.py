"""School logic: read from the db, add a suggested visit focus."""

from fastapi import HTTPException

from app import db
from app.services.focus import suggest_focus


def list_schools():
    schools = db.query("SELECT * FROM schools ORDER BY name")
    for school in schools:
        school["focus"] = suggest_focus(school)
    return schools


def get_school(school_id):
    school = db.query_one("SELECT * FROM schools WHERE id = ?", (school_id,))
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school["focus"] = suggest_focus(school)
    school["teachers"] = db.query(
        "SELECT * FROM teachers WHERE school_id = ? ORDER BY grade", (school_id,)
    )
    return school
