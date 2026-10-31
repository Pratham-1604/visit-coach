"""Visit reports: Claude writes them from the ticks and all the notes; the mentor checks and sends them."""

from app.services import llm
from tests.test_visits import EDITS, a_teacher, sync


def fake_report(seen):
    def parse(system, user, model, **kwargs):
        seen.append(user)
        return model(summary="s", observations=["o"], flags=["f"], support_needed=[]), {}

    return parse


def test_report_is_written_from_notes_and_marked_sent(client, fake_ai, monkeypatch):
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher, children_present=30).json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)

    view = client.get(f"/api/visits/{visit_id}/report").json()
    assert view["report"] is None and view["visit"]["teacher_name"] == teacher["name"]
    assert view["follow_up"] == EDITS["follow_up"] and view["checklist"]["items"]

    seen = []
    monkeypatch.setattr(llm, "parse", fake_report(seen))
    written = client.post(f"/api/visits/{visit_id}/report", json={"language": "mr"}).json()
    assert written["report"]["summary"] == "s" and written["language"] == "mr" and written["sent_at"] is None
    prompt = seen[0]
    assert "Write in: Marathi" in prompt and "transcript 1" in prompt and "typed" in prompt
    assert EDITS["follow_up"] in prompt and "Children present: 30" in prompt

    sent = client.post(f"/api/visits/{visit_id}/report/sent").json()
    assert sent["sent_at"]
    # Writing it again (another language) means it has to be sent again.
    assert client.post(f"/api/visits/{visit_id}/report", json={"language": "en"}).json()["sent_at"] is None


def test_report_needs_a_processed_visit(client, monkeypatch):
    from app import db

    school, teacher = a_teacher(client)
    visit_id = db.execute(
        "INSERT INTO visits (school_id, teacher_id, language, status) VALUES (?, ?, 'mr', 'transcribing')",
        (school["id"], teacher["id"]),
    )
    assert client.post(f"/api/visits/{visit_id}/report", json={}).status_code == 409
    assert client.post(f"/api/visits/{visit_id}/report/sent").status_code == 409
    assert client.get("/api/visits/999999/report").status_code == 404
