"""The knowledge pack must hang together: every id it mentions has to exist."""

import pytest

from app.services import knowledge
from app.services.packet import CoachingPacket, DEMO_VISIT, check_packet, visit_prompt, with_details


def test_rubric_items_have_valid_need_areas_and_sources():
    areas = knowledge.need_areas()
    passages = knowledge.passages()
    for item in knowledge.rubric_items().values():
        assert item["need_area"] in areas, item["id"]
        assert set(item["text"]) == {"en", "hi", "mr", "ta"}, item["id"]
        assert item["source_ids"] and set(item["source_ids"]) <= set(passages), item["id"]


def test_every_rubric_item_has_a_practice():
    for item_id in knowledge.rubric_items():
        assert knowledge.practices_for(item_id), f"no practice fixes {item_id}"


def test_practices_point_at_real_rubric_items_and_passages():
    items = knowledge.rubric_items()
    passages = knowledge.passages()
    for practice in knowledge.practices().values():
        assert set(practice["rubric_item_ids"]) <= set(items), practice["id"]
        assert set(practice["source_ids"]) <= set(passages), practice["id"]
        assert 3 <= len(practice["steps"]) <= 5, practice["id"]


def test_lakshyas_for_grades_1_to_3():
    for grade in (1, 2, 3):
        targets = knowledge.lakshyas(grade)
        assert targets["source_id"] in knowledge.passages()
        assert targets["reading"] and targets["numeracy"]


def test_pack_text_mentions_every_id():
    text = knowledge.pack_text()
    for some_id in [*knowledge.rubric_items(), *knowledge.practices(), *knowledge.passages()]:
        assert some_id in text


def test_rubric_endpoint(client):
    rubric = client.get("/api/rubric").json()
    assert len(rubric["items"]) == len(knowledge.rubric_items())
    assert "source_ids" not in rubric["items"][0]


def make_packet(**changes):
    fields = {
        "strength": "s",
        "priority_rubric_item": "children_read",
        "priority": "p",
        "practice_id": "paired_reading",
        "practice_steps": ["a", "b", "c"],
        "materials": ["m"],
        "demo_script": "d",
        "follow_up": "f",
        "follow_up_check": "c",
        "evidence": ["e"],
        "english_gloss": "g",
        "grounded_in": ["ncf-p115-reading"],
    }
    return CoachingPacket(**{**fields, **changes})


def test_check_packet_accepts_valid_packet():
    assert check_packet(make_packet()) == []


@pytest.mark.parametrize(
    "changes",
    [
        {"priority_rubric_item": "made_up"},
        {"practice_id": "made_up"},
        {"grounded_in": ["nipun-p999"]},
        {"grounded_in": []},
    ],
)
def test_check_packet_rejects_unknown_ids(changes):
    assert check_packet(make_packet(**changes))


def test_with_details_adds_need_area_and_sources():
    data = with_details(make_packet())
    assert data["need_area"] == "early_reading"
    assert data["sources"][0]["page"] == 115


def test_visit_prompt_includes_taps_and_notes():
    prompt = visit_prompt(DEMO_VISIT)
    assert "Marathi" in prompt
    assert "children_read" in prompt
    assert DEMO_VISIT["notes"][0] in prompt
