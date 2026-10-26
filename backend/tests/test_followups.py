"""Next-visit follow-up: open actions per teacher, recording the check, and feeding it into the next packet."""

from tests.test_visits import EDITS, a_teacher, sync


def approve(client, school, teacher):
    visit_id = sync(client, school, teacher).json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)
    client.post(f"/api/visits/{visit_id}/approve")
    return visit_id


def open_for(client, school, teacher):
    followups = client.get(f"/api/schools/{school['id']}").json()["open_followups"]
    return [f for f in followups if f["teacher_id"] == teacher["id"]]


def test_approved_visit_shows_up_as_open_followup(client, fake_ai):
    school, teacher = a_teacher(client)
    visit_id = approve(client, school, teacher)

    [followup] = open_for(client, school, teacher)
    assert followup["visit_id"] == visit_id
    assert followup["follow_up"] == EDITS["follow_up"]
    assert followup["follow_up_check"] == EDITS["follow_up_check"]


def test_recording_closes_it_and_can_be_resent(client, fake_ai):
    school, teacher = a_teacher(client)
    visit_id = approve(client, school, teacher)

    body = {"status": "partly", "note": "only front rows", "teacher_rating": 4}
    assert client.post(f"/api/followups/{visit_id}", json=body).json()["status"] == "partly"
    assert open_for(client, school, teacher) == []

    # The phone's outbox may send it twice, or the CRP may change the answer: it replaces the old one.
    again = client.post(f"/api/followups/{visit_id}", json={**body, "status": "done"}).json()
    assert again["status"] == "done"
    assert again["teacher_rating"] == 4


def test_followup_needs_an_approved_visit_and_valid_values(client, fake_ai):
    school, teacher = a_teacher(client)
    unapproved = sync(client, school, teacher).json()["id"]
    assert client.post(f"/api/followups/{unapproved}", json={"status": "done"}).status_code == 409
    assert client.post("/api/followups/99999", json={"status": "done"}).status_code == 404

    approved = approve(client, school, teacher)
    assert client.post(f"/api/followups/{approved}", json={"status": "maybe"}).status_code == 422
    assert client.post(f"/api/followups/{approved}", json={"status": "done", "teacher_rating": 9}).status_code == 422


def test_next_packet_gets_the_previous_action_and_result(client, fake_ai):
    school, teacher = a_teacher(client)
    first = approve(client, school, teacher)
    client.post(f"/api/followups/{first}", json={"status": "partly", "note": "front rows only"})

    sync(client, school, teacher)
    previous = fake_ai["packet"][-1]["previous_action"]
    assert EDITS["follow_up"] in previous
    assert "partly done" in previous and "front rows only" in previous


def test_offline_pack_has_everything_for_a_school_visit(client):
    pack = client.get("/api/offline-pack").json()
    assert pack["schools"] and pack["rubric"]["items"]
    school = pack["schools"][0]
    details = pack["school_details"][str(school["id"])]
    assert details["teachers"] and "open_followups" in details
