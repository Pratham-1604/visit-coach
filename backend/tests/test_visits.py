import json
import uuid

from app.controllers import visits as visits_controller
from app.services import asr, llm
from tests.conftest import FAKE_PACKET


def a_teacher(client):
    school = client.get(f"/api/schools/{client.get('/api/schools').json()[0]['id']}").json()
    return school, school["teachers"][0]


def sync(client, school, teacher, client_id=None, notes=2, **extra):
    visit = {
        "client_id": client_id or str(uuid.uuid4()),
        "school_id": school["id"],
        "teacher_id": teacher["id"],
        "subject": "literacy",
        "rubric": {"children_read": "no"},
        "typed_note": "typed",
        **extra,
    }
    files = [("notes", (f"{n}.webm", b"audio", "audio/webm;codecs=opus")) for n in range(notes)]
    return client.post("/api/visits/sync", data={"visit": json.dumps(visit)}, files=files)


def test_sync_transcribes_and_builds_packet(client, fake_ai):
    school, teacher = a_teacher(client)
    response = sync(client, school, teacher)
    assert response.status_code == 200
    visit_id = response.json()["id"]

    # TestClient runs background tasks before returning, so the pipeline is done.
    visit = client.get(f"/api/visits/{visit_id}").json()
    assert visit["status"] == "ready"
    assert visit["packet"] == FAKE_PACKET
    assert [note["transcript"] for note in visit["notes"]] == ["transcript 1", "transcript 2"]

    assert [call[1:] for call in fake_ai["asr"]] == [(school["language"], "audio/webm")] * 2
    sent = fake_ai["packet"][0]
    assert sent["notes"] == ["transcript 1", "transcript 2", "typed"]
    assert sent["grade"] == teacher["grade"]
    assert sent["rubric"] == {"children_read": "no"}


def test_sync_is_safe_to_retry(client, fake_ai):
    school, teacher = a_teacher(client)
    client_id = str(uuid.uuid4())
    first = sync(client, school, teacher, client_id=client_id).json()
    second = sync(client, school, teacher, client_id=client_id).json()
    assert first["id"] == second["id"]
    assert len(fake_ai["packet"]) == 1


def test_failure_is_reported_and_retry_works(client, fake_ai, monkeypatch):
    school, teacher = a_teacher(client)

    def broken(path, language, mime):
        raise asr.ASRError("Sarvam is down")

    monkeypatch.setattr(asr, "transcribe", broken)
    visit_id = sync(client, school, teacher).json()["id"]
    visit = client.get(f"/api/visits/{visit_id}").json()
    assert visit["status"] == "failed"
    assert visit["error"] == "Sarvam is down"

    monkeypatch.setattr(visits_controller.asr, "transcribe", lambda path, language, mime: "ok")
    assert client.post(f"/api/visits/{visit_id}/retry").status_code == 200
    assert client.get(f"/api/visits/{visit_id}").json()["status"] == "ready"

    # Only failed visits can be retried.
    assert client.post(f"/api/visits/{visit_id}/retry").status_code == 409


def test_llm_failure_is_reported(client, fake_ai, monkeypatch):
    def broken(visit):
        raise llm.LLMError("Claude declined")

    monkeypatch.setattr(visits_controller, "generate_packet", broken)
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher, notes=0).json()["id"]
    visit = client.get(f"/api/visits/{visit_id}").json()
    assert (visit["status"], visit["error"]) == ("failed", "Claude declined")


def test_teacher_must_belong_to_school(client, fake_ai):
    schools = client.get("/api/schools").json()
    school, teacher = a_teacher(client)
    other = next(s for s in schools if s["id"] != school["id"])
    assert sync(client, other, teacher).status_code == 400


def test_bad_visit_json_is_422(client, fake_ai):
    school, teacher = a_teacher(client)
    assert sync(client, school, teacher, subject="art").status_code == 422


def test_unknown_visit_is_404(client):
    assert client.get("/api/visits/99999").status_code == 404


EDITS = {
    "strength": "edited strength",
    "priority": "edited priority",
    "practice_steps": ["step 1", "  ", "step 2 "],
    "materials": ["chalk"],
    "demo_script": "demo",
    "follow_up": "try it",
    "follow_up_check": "ask 3 children",
}


def test_crp_edits_then_approves(client, fake_ai):
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher).json()["id"]

    visit = client.put(f"/api/visits/{visit_id}/packet", json=EDITS).json()
    assert visit["packet_edited"] is True
    assert visit["packet"]["strength"] == "edited strength"
    assert visit["packet"]["practice_steps"] == ["step 1", "step 2"]  # blanks dropped, trimmed
    assert visit["packet"]["english_gloss"] == FAKE_PACKET["english_gloss"]  # not editable, kept

    visit = client.post(f"/api/visits/{visit_id}/approve").json()
    assert visit["status"] == "approved"
    assert visit["share_token"]
    assert visit["approved_at"]

    # Approved packets are locked.
    assert client.put(f"/api/visits/{visit_id}/packet", json=EDITS).status_code == 409
    assert client.post(f"/api/visits/{visit_id}/approve").status_code == 409


def test_original_packet_is_kept_for_edit_rate(client, fake_ai):
    from app import db

    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher).json()["id"]
    client.put(f"/api/visits/{visit_id}/packet", json=EDITS)
    row = db.query_one("SELECT original_json, edited_json FROM packets WHERE visit_id = ?", (visit_id,))
    assert json.loads(row["original_json"]) == FAKE_PACKET
    assert json.loads(row["edited_json"])["strength"] == "edited strength"


def test_cannot_review_before_packet_is_ready(client, fake_ai, monkeypatch):
    monkeypatch.setattr(asr, "transcribe", lambda *args: (_ for _ in ()).throw(asr.ASRError("down")))
    school, teacher = a_teacher(client)
    visit_id = sync(client, school, teacher).json()["id"]
    assert client.put(f"/api/visits/{visit_id}/packet", json=EDITS).status_code == 409
    assert client.post(f"/api/visits/{visit_id}/approve").status_code == 409
