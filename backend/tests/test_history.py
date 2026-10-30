"""Coaching history: continuity for the teacher when the mentor changes (MENTOR.md #6)."""

from app.seed import DEMO_MENTOR, MENTORS
from app.services.packet import visit_prompt
from tests.test_visits import EDITS, a_teacher, sync


def approve(client, school, teacher, **extra):
    visit_id = sync(client, school, teacher, **extra).json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)
    return client.post(f"/api/visits/{visit_id}/approve").json()


def history_of(client, school, teacher):
    details = client.get(f"/api/schools/{school['id']}").json()
    return next(t for t in details["teachers"] if t["id"] == teacher["id"])["history"]


def test_history_is_newest_first_and_names_each_mentor(client, fake_ai):
    school, teacher = a_teacher(client)
    first = approve(client, school, teacher, mentor_name="Asha Mentor")
    client.post(f"/api/followups/{first['id']}", json={"status": "done", "note": "seen in class"})
    second = approve(client, school, teacher, mentor_name="  Ravi Mentor  ")

    history = history_of(client, school, teacher)
    assert [entry["visit_id"] for entry in history[:2]] == [second["id"], first["id"]]
    assert history[0]["mentor_name"] == "Ravi Mentor"
    assert history[0]["result"] is None  # not checked yet
    assert history[1]["result"] == "done" and history[1]["follow_up"] == EDITS["follow_up"]


def test_next_packet_gets_up_to_three_earlier_actions(client, fake_ai):
    school, teacher = a_teacher(client)
    for mentor in ("A", "B", "C", "D"):
        approve(client, school, teacher, mentor_name=f"Mentor {mentor}")
    sync(client, school, teacher)

    actions = fake_ai["packet"][-1]["previous_actions"]
    assert len(actions) == 3
    assert "Mentor D" in actions[0] and "Mentor B" in actions[2]


def test_class_context_is_saved_and_sent_to_claude(client, fake_ai):
    school, teacher = a_teacher(client)
    visit = sync(client, school, teacher, children_present=32, grades_together=[2, 1, 2]).json()
    assert visit["children_present"] == 32 and visit["grades_together"] == [1, 2]

    sent = fake_ai["packet"][-1]
    assert sent["grades_together"] == [1, 2]
    prompt = visit_prompt({**sent, "rubric": {}, "notes": []})
    assert "Grades sitting together in this class: 1, 2" in prompt and "Children present: 32" in prompt

    assert sync(client, school, teacher, children_present=-1).status_code == 422


def test_teacher_link_shows_earlier_coaching_but_not_mentor_notes(client, fake_ai):
    school, teacher = a_teacher(client)
    first = approve(client, school, teacher, mentor_name="Leena Link")
    client.post(f"/api/followups/{first['id']}", json={"status": "partly", "note": "private mentor note"})
    second = approve(client, school, teacher, mentor_name="Omkar Link")

    shared = client.get(f"/api/t/{second['share_token']}").json()
    assert shared["mentor_name"] == "Omkar Link"
    assert shared["history"][0]["mentor_name"] == "Leena Link"
    assert shared["history"][0]["result"] == "partly"
    assert all(entry.get("mentor_name") != "Omkar Link" for entry in shared["history"])  # only earlier visits
    assert "private mentor note" not in str(shared)


def test_demo_teacher_has_three_visits_by_two_mentors(client):
    schools = client.get("/api/schools").json()
    wagholi = next(s for s in schools if s["village"] == "Wagholi")
    sunita = client.get(f"/api/schools/{wagholi['id']}").json()["teachers"][0]
    seeded = [entry for entry in sunita["history"] if entry["mentor_name"] in MENTORS]
    assert len(seeded) == 3
    assert {entry["mentor_name"] for entry in seeded} == set(MENTORS)
    assert DEMO_MENTOR not in MENTORS
    assert all(s["language"] == "mr" for s in schools)  # Maharashtra first (MENTOR.md #2)
