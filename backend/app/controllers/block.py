"""Block view logic: read visits, packets and follow-ups, hand only counts to the block officer."""

import json

from app import db
from app.services import knowledge
from app.services.block import aggregate_needs, compute_metrics


def block_summary():
    approved = db.query(
        "SELECT v.school_id, v.observed_at, p.approved_at, p.original_json, p.edited_json"
        " FROM visits v JOIN packets p ON p.visit_id = v.id"
        " WHERE v.status = 'approved' ORDER BY p.approved_at, v.id"
    )

    latest_need = {}
    packets = []
    for row in approved:
        packet = json.loads(row["edited_json"] or row["original_json"])
        latest_need[row["school_id"]] = packet.get("need_area")  # rows are oldest first, so the last one wins
        packets.append(
            {
                "observed_at": row["observed_at"],
                "approved_at": row["approved_at"],
                "edited": bool(row["edited_json"]),
                "has_action": bool((packet.get("follow_up") or "").strip()),
            }
        )

    labels = {area_id: area["label"] for area_id, area in knowledge.need_areas().items()}
    synced = db.query_one("SELECT COUNT(*) AS n FROM visits")["n"]
    followups = db.query("SELECT status, teacher_rating FROM followups")

    return {
        "schools_total": db.query_one("SELECT COUNT(*) AS n FROM schools")["n"],
        **aggregate_needs({k: v for k, v in latest_need.items() if v}, labels),
        "metrics": compute_metrics(synced, packets, followups),
    }
