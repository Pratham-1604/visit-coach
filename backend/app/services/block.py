"""Block officer's view: where schools need support, and whether coaching is happening.

Pure functions over rows the controller reads. Only counts and averages come out:
no school, teacher, note or packet text (DECISIONS.md #10).
"""

from collections import Counter
from datetime import datetime, timezone
from statistics import mean, median

# A need area is shown only if at least this many schools share it, so nobody can tell which school it is.
MIN_SCHOOLS = 5


def aggregate_needs(latest_need_by_school, labels, min_schools=MIN_SCHOOLS):
    """`latest_need_by_school`: {school_id: need_area of its latest approved packet}."""
    counts = Counter(latest_need_by_school.values())
    shown = [
        {"need_area": area, "label": labels.get(area, area), "schools": count}
        for area, count in counts.most_common()
        if count >= min_schools
    ]
    other = sum(count for count in counts.values() if count < min_schools)
    return {"needs": shown, "other_schools": other, "schools_with_packets": len(latest_need_by_school)}


def compute_metrics(synced_visits, approved_packets, followups):
    """The five numbers promised in the proposal.

    synced_visits:    number of visits that reached the server
    approved_packets: [{observed_at, approved_at, edited, has_action}]
    followups:        [{status, teacher_rating}]
    """
    minutes = [
        (parse_time(p["approved_at"]) - parse_time(p["observed_at"])).total_seconds() / 60
        for p in approved_packets
        if p["observed_at"] and p["approved_at"]
    ]
    statuses = Counter(f["status"] for f in followups)
    ratings = [f["teacher_rating"] for f in followups if f["teacher_rating"]]

    return {
        "visits": synced_visits,
        "approved": len(approved_packets),
        "minutes_to_feedback": round(median(minutes)) if minutes else None,
        "pct_with_action": percent(sum(p["has_action"] for p in approved_packets), synced_visits),
        "followups_checked": len(followups),
        "pct_done": percent(statuses["done"], len(followups)),
        "pct_partly": percent(statuses["partly"], len(followups)),
        "pct_edited": percent(sum(p["edited"] for p in approved_packets), len(approved_packets)),
        "avg_usefulness": round(mean(ratings), 1) if ratings else None,
    }


def percent(part, whole):
    return round(100 * part / whole) if whole else None


def parse_time(value):
    """Times come as phone ISO strings ('...Z') or SQLite UTC strings ('2026-10-25 09:30:00')."""
    moment = datetime.fromisoformat(value.replace(" ", "T"))
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
