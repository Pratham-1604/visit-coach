"""The teacher's shared link, and the rule that CRP notes never reach the teacher."""

from app.services.packet import TEACHER_FIELDS, crp_notes_in, readable_ids
from tests.test_visits import EDITS, a_teacher, sync


def approved_visit(client):
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher).json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)
    return client.post(f"/api/visits/{visit_id}/approve").json()


def test_teacher_sees_only_the_teacher_parts(client, fake_ai):
    visit = approved_visit(client)
    shared = client.get(f"/api/t/{visit['share_token']}").json()

    assert shared["packet"]["strength"] == "edited strength"
    assert set(shared["packet"]) == set(TEACHER_FIELDS)
    assert shared["teacher_first_name"] == visit["teacher_name"].split()[0]
    for private in ("evidence", "sources", "english_gloss", "notes", "transcript"):
        assert private not in str(shared)


def test_unknown_link_is_404(client):
    assert client.get("/api/t/not-a-real-token").status_code == 404


def test_cannot_approve_with_a_note_for_the_crp(client, fake_ai):
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher).json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json={**EDITS, "strength": "Good start. [CRP: add an example]"})

    response = client.post(f"/api/visits/{visit_id}/approve")
    assert response.status_code == 409
    assert "strength" in response.json()["detail"]

    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)
    assert client.post(f"/api/visits/{visit_id}/approve").status_code == 200


def test_crp_notes_are_found_in_text_and_lists():
    assert crp_notes_in({"strength": "[ crp: fill in]"}) == ["strength"]
    assert crp_notes_in({"practice_steps": ["one", "CRP: check this"]}) == ["practice_steps"]
    assert crp_notes_in({"strength": "बच्चों ने खुद पढ़ा", "follow_up": None}) == []


def test_rubric_ids_become_wording():
    assert "children_read" not in readable_ids("Priority is children_read (rated no).")
