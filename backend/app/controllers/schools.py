"""School logic: read from the db, add a suggested visit focus."""

from fastapi import HTTPException

from app import db
from app.controllers.followups import open_followups
from app.controllers.history import teacher_history
from app.services.focus import suggest_focus


# The demo mentor's cluster: the first schools seeded (Wagholi, Lonikand, Kesnand). The block officer's
# counts and the state's checklist insights still use every school.
MENTOR_SCHOOLS = 3


def list_schools():
    schools = db.query(
        "SELECT * FROM (SELECT * FROM schools ORDER BY id LIMIT ?) ORDER BY name",
        (MENTOR_SCHOOLS,),
    )
    for school in schools:
        school["focus"] = suggest_focus(school)
        # For search and filters on the home screen.
        school["teacher_names"] = [
            row["name"] for row in db.query("SELECT name FROM teachers WHERE school_id = ? ORDER BY grade", (school["id"],))
        ]
        school["open_actions"] = len(open_followups(school["id"]))
        school["last_visit"] = db.query_one(
            "SELECT MAX(p.approved_at) AS last FROM visits v JOIN packets p ON p.visit_id = v.id"
            " WHERE v.school_id = ? AND v.status = 'approved'",
            (school["id"],),
        )["last"]
    return schools


def get_school(school_id):
    school = db.query_one("SELECT * FROM schools WHERE id = ?", (school_id,))
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school["focus"] = suggest_focus(school)
    school["teachers"] = db.query(
        "SELECT * FROM teachers WHERE school_id = ? ORDER BY grade", (school_id,)
    )
    # Each teacher's coaching so far, across mentors. Part of the offline pack, so it opens in school.
    for teacher in school["teachers"]:
        teacher["history"] = teacher_history(teacher["id"])
    # Actions agreed at the last visit, for the CRP to check this time.
    school["open_followups"] = open_followups(school_id)
    return school
