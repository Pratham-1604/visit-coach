"""Rehearsal endpoints, with Claude faked so tests are free and offline."""

import pytest

from app.services import llm, rehearsal
from tests.test_visits import a_teacher, sync

CRITERION = {"score": 9, "comment": "ok"}  # out of range on purpose: the server clamps to 1-4


@pytest.fixture
def fake_claude(monkeypatch):
    prompts = []

    def parse(system, user, model, effort="medium", max_tokens=16000):
        prompts.append({"system": system, "user": user, "effort": effort})
        if model is rehearsal.TeacherReply:
            return model(reply="I have 45 children, when would I do this?"), {}
        return model(
            **{key: CRITERION for key in ("specific", "strength_first", "one_priority", "invites_teacher", "agreed_action")},
            overall_tip="Ask before suggesting.",
            better_line="आपको क्या लगता है?",
        ), {}

    monkeypatch.setattr(rehearsal.llm, "parse", parse)
    return prompts


def ready_visit(client):
    school, teacher = a_teacher(client)
    return sync(client, school, teacher).json()["id"]


def test_teacher_replies_in_character(client, fake_ai, fake_claude):
    visit_id = ready_visit(client)
    history = [{"role": "crp", "text": "Your picture talk was lovely."}]
    reply = client.post(f"/api/rehearsal/{visit_id}/turn", json={"history": history}).json()

    assert "45 children" in reply["reply"]
    assert "Your picture talk was lovely." in fake_claude[-1]["user"]
    assert fake_claude[-1]["effort"] == "low"


def test_score_is_clamped_and_needs_crp_lines(client, fake_ai, fake_claude):
    visit_id = ready_visit(client)
    assert client.post(f"/api/rehearsal/{visit_id}/score", json={"history": []}).status_code == 400

    history = [{"role": "crp", "text": "Shall we try pairs?"}, {"role": "teacher", "text": "Maybe."}]
    score = client.post(f"/api/rehearsal/{visit_id}/score", json={"history": history}).json()
    assert score["specific"]["score"] == 4
    assert score["better_line"]


def test_rehearsal_needs_a_ready_packet(client, fake_ai, fake_claude, monkeypatch):
    from app.services import asr

    monkeypatch.setattr(asr, "transcribe", lambda *args: (_ for _ in ()).throw(asr.ASRError("down")))
    failed = ready_visit(client)
    assert client.post(f"/api/rehearsal/{failed}/turn", json={"history": []}).status_code == 409
    assert client.post("/api/rehearsal/99999/turn", json={"history": []}).status_code == 404


def test_rehearsal_stays_short(client, fake_ai, fake_claude):
    visit_id = ready_visit(client)
    long = [{"role": "crp", "text": "hello"}] * (rehearsal.MAX_TURNS + 1)
    assert client.post(f"/api/rehearsal/{visit_id}/turn", json={"history": long}).status_code == 400


def test_claude_failure_is_502(client, fake_ai, monkeypatch):
    visit_id = ready_visit(client)

    def broken(*args, **kwargs):
        raise llm.LLMError("Claude API error 529: overloaded")

    monkeypatch.setattr(rehearsal.llm, "parse", broken)
    response = client.post(f"/api/rehearsal/{visit_id}/turn", json={"history": []})
    assert response.status_code == 502
    assert "overloaded" in response.json()["detail"]
