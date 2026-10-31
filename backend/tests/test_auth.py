"""Demo logins: mentors use the app, the block officer sees support planning only, teachers need no login."""

from tests.conftest import log_in
from tests.test_visits import EDITS, a_teacher, sync


def test_login_returns_the_user_and_me_works(anonymous):
    user = log_in(anonymous, "Sachin ", "sachin123")  # username is not case- or space-sensitive
    assert user == {"id": user["id"], "username": "sachin", "name": "Sachin Gore", "role": "mentor"}
    assert anonymous.get("/api/auth/me").json()["name"] == "Sachin Gore"


def test_wrong_password_is_401(anonymous):
    response = anonymous.post("/api/auth/login", json={"username": "sachin", "password": "nope"})
    assert response.status_code == 401
    assert "password_hash" not in response.text


def test_mentor_endpoints_need_a_login(anonymous):
    assert anonymous.get("/api/schools").status_code == 401
    assert anonymous.get("/api/block/summary").status_code == 401
    assert anonymous.get("/api/health").status_code == 200


def test_officer_sees_support_planning_only(anonymous):
    log_in(anonymous, "officer", "officer123")
    assert anonymous.get("/api/block/summary").status_code == 200
    assert anonymous.get("/api/schools").status_code == 403
    assert anonymous.get("/api/offline-pack").status_code == 403


def test_logout_ends_the_session(client):
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/schools").status_code == 401


def test_visit_is_by_the_logged_in_mentor_and_teacher_link_needs_no_login(client, anonymous, fake_ai):
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher, mentor_name="Someone Else").json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)
    approved = client.post(f"/api/visits/{visit_id}/approve").json()

    assert client.get(f"/api/visits/{visit_id}").json()["mentor_name"] == "Sachin Gore"
    shared = anonymous.get(f"/api/t/{approved['share_token']}")
    assert shared.status_code == 200 and shared.json()["mentor_name"] == "Sachin Gore"
