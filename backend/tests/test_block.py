"""Block officer's view: counts only, no group under 5 schools, nothing that identifies a school or teacher."""

import json

from app.seed import SCHOOLS, TEACHERS
from app.services.block import aggregate_needs, compute_metrics


def test_small_groups_are_merged_into_other():
    latest = {1: "a", 2: "a", 3: "a", 4: "a", 5: "a", 6: "b", 7: "b"}
    result = aggregate_needs(latest, {"a": "Reading"})
    assert result["needs"] == [{"need_area": "a", "label": "Reading", "schools": 5}]
    assert result["other_schools"] == 2
    assert result["schools_with_packets"] == 7


def test_metrics_from_rows():
    packets = [
        {"observed_at": "2026-10-20T04:00:00Z", "approved_at": "2026-10-20 05:00:00", "edited": True, "has_action": True},
        {"observed_at": "2026-10-21T04:00:00Z", "approved_at": "2026-10-21 04:30:00", "edited": False, "has_action": True},
    ]
    followups = [{"status": "done", "teacher_rating": 4}, {"status": "partly", "teacher_rating": None}]
    metrics = compute_metrics(4, packets, followups)
    assert metrics["minutes_to_feedback"] == 45
    assert metrics["pct_with_action"] == 50
    assert metrics["pct_done"] == 50 and metrics["pct_partly"] == 50
    assert metrics["pct_edited"] == 50
    assert metrics["avg_usefulness"] == 4


def test_seeded_block_shows_the_reading_need(client):
    summary = client.get("/api/block/summary").json()
    assert summary["schools_total"] == len(SCHOOLS)
    reading = next(need for need in summary["needs"] if need["need_area"] == "early_reading")
    assert reading["schools"] == 14
    assert all(need["schools"] >= 5 for need in summary["needs"])
    assert summary["metrics"]["followups_checked"] >= len(SCHOOLS)


def test_block_summary_never_names_a_school_or_teacher(client):
    text = json.dumps(client.get("/api/block/summary").json(), ensure_ascii=False)
    for name, village, *_ in SCHOOLS:
        assert name not in text and village not in text
    for _, teacher, _ in TEACHERS:
        assert teacher.split()[0] not in text
    assert "Demo data" not in text  # no packet text
