"""Suggestions for the next version of a state's checklist, from the visits observed with it.

Two parts:
- item_stats (rules, no AI): items almost every visit rates "yes" (retire, or raise the bar?) and items
  mentors often leave unrated (hard to observe? reword?).
- suggest_new_items (Claude): problems mentors keep writing in their notes that no item covers.
Only totals and themes come out; no school, teacher or child is named.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.services import llm
from app.services.packet import LANGUAGES, covers

MIN_VISITS = 5  # don't judge an item on fewer visits than this (5 suits the 5-school demo; a real state would use more)
MET_PCT = 90  # "yes" in at least this share of visits: almost always met
SKIPPED_PCT = 50  # unrated in at least this share of visits: often skipped
MAX_NOTES = 80
NOTE_CHARS = 400


def item_stats(items, visits):
    """items: the checklist items; visits: [{subject, rubric}]. Returns one row per item, with a flag."""
    rows = []
    for item in items:
        relevant = [visit for visit in visits if covers(visit["subject"], item)]
        counts = {"yes": 0, "partly": 0, "no": 0, "skipped": 0}
        for visit in relevant:
            counts[visit["rubric"].get(item["id"], "skipped")] += 1
        total = len(relevant)
        pct = {key: round(100 * value / total) if total else 0 for key, value in counts.items()}
        flag = None
        if total >= MIN_VISITS and pct["yes"] >= MET_PCT:
            flag = "met"
        elif total >= MIN_VISITS and pct["skipped"] >= SKIPPED_PCT:
            flag = "skipped"
        rows.append({"id": item["id"], "visits": total, **counts, "pct": pct, "flag": flag})
    return rows


class NewItem(BaseModel):
    id: str = Field(description="New snake_case id, not already on the checklist, e.g. drinking_water")
    subject: Literal["literacy", "numeracy", "both"]
    need_area: str = Field(description="One of the need area ids given")
    text_en: str = Field(description="The item as a mentor would tick it, in English, under 120 characters")
    text_mr: str = Field(description="The same item in Marathi")
    text_hi: str = Field(description="The same item in Hindi")
    look_for: str = Field(description="What a mentor can see in class when this is met, in English, one sentence")
    reason: str = Field(description="What the notes keep saying, in the requested language, one or two sentences")
    visits_mentioning: int = Field(description="How many of the notes mention this problem")


class Suggestions(BaseModel):
    summary: str = Field(description="2-3 sentences for the state government, in the requested language")
    new_items: list[NewItem] = Field(description="At most 5 new items, most important first. Empty if none.")


INSTRUCTIONS = """You help a state education department (SCERT) improve the classroom observation checklist that \
cluster mentors (Kendra Pramukhs) use in Grades 1-3 of government schools.

You get the current checklist, totals from the visits observed with it, and mentors' notes from those visits. \
Suggest new checklist items only for problems that come up again and again in the notes (in at least 3 notes) \
and that no current item covers. Each item must be something a mentor can observe or check during a visit. \
Prefer problems that stop children learning: attendance, water and safety, missing books, children who don't \
understand the language of teaching.

Never name a school, teacher or child. Never invent problems that the notes don't show. In the summary, also \
mention the items that are almost always met or often skipped, if any are given. Write summary and reason in \
the language you are asked to use."""


def suggest_new_items(items, stats, notes, need_area_ids, language):
    """Ask Claude for new items from recurring notes. Returns Suggestions as a dict, with invalid items dropped."""
    lines = [
        f"Write summary and reasons in: {LANGUAGES.get(language, language)}",
        f"Need area ids: {', '.join(sorted(need_area_ids))}",
        "",
        "Current checklist (id: wording):",
    ]
    lines += [f"- {item['id']}: {item['text']['en']}" for item in items]
    flagged = [row for row in stats if row["flag"]]
    if flagged:
        lines += ["", "From the visits:"]
        for row in flagged:
            what = "rated yes" if row["flag"] == "met" else "left unrated"
            lines.append(f"- {row['id']}: {what} in {row['pct']['yes' if row['flag'] == 'met' else 'skipped']}% of {row['visits']} visits")
    lines += ["", f"Mentors' notes from {len(notes)} visits:"]
    lines += [f"{n}. {note[:NOTE_CHARS]}" for n, note in enumerate(notes[:MAX_NOTES], 1)] or ["(none)"]

    result, _usage = llm.parse(INSTRUCTIONS, "\n".join(lines), Suggestions, effort="medium", max_tokens=8000)
    data = result.model_dump()
    taken = {item["id"] for item in items}
    kept = []
    for item in data["new_items"]:
        if item["id"] in taken or item["need_area"] not in need_area_ids:
            continue
        taken.add(item["id"])
        kept.append(item)
    data["new_items"] = kept[:5]
    return data


def as_checklist_item(new_item):
    """A suggested item in the checklist's own shape, so it can go into the next version's CSV."""
    return {
        "id": new_item["id"],
        "subject": new_item["subject"],
        "need_area": new_item["need_area"],
        "text": {"en": new_item["text_en"], "mr": new_item["text_mr"], "hi": new_item["text_hi"]},
        "look_for": new_item["look_for"],
    }
