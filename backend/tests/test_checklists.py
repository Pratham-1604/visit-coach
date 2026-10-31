"""State checklists: versions, upload by the state admin, and visits using the version they were observed with."""

import json

import pytest

from app.services.checklist_file import ChecklistFileError, parse_checklist
from tests.conftest import log_in
from tests.test_visits import a_teacher, sync

NEED_AREAS = {"early_reading", "inclusion"}
GOOD_CSV = (
    "id,subject,need_area,text_en,text_mr,text_hi,look_for,kpalp\n"
    "children_read,literacy,early_reading,Children read text themselves,मुले स्वतः वाचतात,,Eyes on the text,2.1\n"
    'water_corner,both,inclusion,"Clean drinking water, reachable by children",,,A tap or matka children use,\n'
)


@pytest.fixture(autouse=True)
def keep_version_one():
    """Tests share one database: remove uploaded versions so later tests see the original checklist."""
    yield
    from app import db

    db.execute("DELETE FROM checklists WHERE version > 1")


@pytest.fixture
def admin(anonymous):
    log_in(anonymous, "admin", "admin123")
    return anonymous


def upload(client, text, filename="checklist.csv", **form):
    return client.post("/api/checklists", files={"file": (filename, text.encode(), "text/csv")}, data=form)


def test_csv_is_parsed_and_cleaned():
    items = parse_checklist("list.csv", GOOD_CSV.encode("utf-8-sig"), NEED_AREAS)
    assert [item["id"] for item in items] == ["children_read", "water_corner"]
    assert items[0]["text"] == {"en": "Children read text themselves", "mr": "मुले स्वतः वाचतात"}
    assert items[1]["text"]["en"] == "Clean drinking water, reachable by children" and "kpalp" not in items[1]


def test_every_problem_is_reported_at_once():
    bad = "id,subject,need_area,text_en\nBad Id,science,cooking,\nok_id,both,inclusion,Fine\nok_id,both,inclusion,Again\n"
    with pytest.raises(ChecklistFileError) as err:
        parse_checklist("list.csv", bad.encode(), NEED_AREAS)
    text = " ".join(err.value.problems)
    for expected in ("id must be", "subject must be", "need_area must be", "text_en", "used twice"):
        assert expected in text


def test_json_and_unknown_formats():
    items = [{"id": "x_item", "subject": "both", "need_area": "inclusion", "text": {"en": "X"}}]
    assert parse_checklist("a.json", json.dumps({"items": items}).encode(), NEED_AREAS)[0]["id"] == "x_item"
    with pytest.raises(ChecklistFileError):
        parse_checklist("a.xlsx", b"...", NEED_AREAS)


def test_admin_uploads_a_new_version_that_mentors_then_get(admin, client):
    before = admin.get("/api/checklists").json()
    response = upload(admin, GOOD_CSV, note="Added drinking water")
    assert response.status_code == 200
    new = response.json()
    assert new["version"] == before["active"]["version"] + 1 and len(new["items"]) == 2

    overview = admin.get("/api/checklists").json()
    assert overview["active"]["id"] == new["id"]
    assert overview["versions"][0]["note"] == "Added drinking water"
    assert overview["versions"][0]["uploaded_by"] == "SCERT Maharashtra (state admin)"

    assert client.get("/api/rubric").json()["id"] == new["id"]

    csv_text = admin.get(f"/api/checklists/{new['id']}/csv").text
    assert csv_text.startswith("id,subject,need_area") and "water_corner" in csv_text


def test_bad_upload_lists_problems_and_changes_nothing(admin):
    active = admin.get("/api/checklists").json()["active"]["id"]
    response = upload(admin, "id,subject\nonly,both\n")
    assert response.status_code == 422
    assert response.json()["detail"]["problems"]
    assert admin.get("/api/checklists").json()["active"]["id"] == active


def test_only_the_state_admin_manages_checklists(client):
    assert client.get("/api/checklists").status_code == 403
    assert upload(client, GOOD_CSV).status_code == 403


def test_packet_uses_the_checklist_the_visit_was_observed_with(admin, client, fake_ai):
    checklist = upload(admin, GOOD_CSV).json()
    school, teacher = a_teacher(client)
    sync(client, school, teacher, checklist_id=checklist["id"], rubric={"water_corner": "no"})

    sent = fake_ai["packet"][-1]
    assert set(sent["checklist"]) == {"children_read", "water_corner"}


def test_review_before_ending_a_visit(client, monkeypatch):
    from app.services import llm, review

    seen = {}

    def fake_parse(system, user, model, **kwargs):
        seen["user"] = user
        return model(
            mismatches=[
                {"item_id": "every_child_turn", "notes_say": "only front rows", "suggestion": "re-check"},
                {"item_id": "not_on_list", "notes_say": "x", "suggestion": "y"},
            ],
            missed=[{"point": "no drinking water", "why": "children leave class"}],
        ), {}

    monkeypatch.setattr(llm, "parse", fake_parse)
    response = client.post(
        "/api/visits/review",
        json={"rubric": {"every_child_turn": "yes"}, "typed_note": "Only front rows answered.", "language": "mr"},
    )
    assert response.status_code == 200
    data = response.json()
    assert [m["item_id"] for m in data["mismatches"]] == ["every_child_turn"]  # unknown ids are dropped
    assert data["missed"][0]["point"] == "no drinking water"
    assert "Write in: Marathi" in seen["user"] and "every_child_turn" in seen["user"] and "-> yes" in seen["user"]
    assert review.INSTRUCTIONS  # the prompt exists

    monkeypatch.setattr(llm, "parse", lambda *a, **k: (_ for _ in ()).throw(llm.LLMError("down")))
    assert client.post("/api/visits/review", json={}).status_code == 502
