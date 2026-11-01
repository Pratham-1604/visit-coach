"""'Did I miss anything?': before the mentor ends a visit, Claude reads the checklist taps and notes together.

It looks for two things only: a rating that the notes contradict, and something important in the
notes that no checklist item captures. One quick call (effort low); nothing is stored.
"""

from pydantic import BaseModel, Field

from app.services import llm
from app.services.packet import LANGUAGES


class Mismatch(BaseModel):
    item_id: str = Field(description="Id of the checklist item whose rating the notes contradict")
    notes_say: str = Field(description="What the notes say about it, short, in the requested language")
    suggestion: str = Field(description="What to re-check or change before ending, one sentence, in the requested language")


class Missed(BaseModel):
    point: str = Field(description="An important observation in the notes that no checklist item captures, in the requested language")
    why: str = Field(description="Why it matters for the children, one sentence, in the requested language")


class VisitReview(BaseModel):
    mismatches: list[Mismatch] = Field(description="Ratings the notes contradict. Empty if none.")
    missed: list[Missed] = Field(description="Important points from the notes the checklist doesn't capture. Empty if none.")


INSTRUCTIONS = """You help a cluster mentor (Kendra Pramukh) finish a classroom observation in an Indian government \
primary school, Grades 1-3. Before the mentor leaves the class, you compare the checklist ratings with the \
mentor's notes so that no critical point is missed.

Report only:
- mismatches: a checklist rating that the notes clearly contradict (e.g. rated "yes" for every child getting a \
turn, but the notes say only the front rows answered). Use the exact item ids given.
- missed: something important in the notes that no checklist item captures, especially child safety, \
attendance, missing materials or a child who needs extra help.

Be brief and specific. Never invent observations that are not in the notes. If the notes are empty or say \
nothing new, return empty lists. Never use children's names. Write every text field in the language you are \
asked to use, in simple words."""


def review_visit(items, rubric, notes, grade, subject, language):
    """items: {id: checklist item}; rubric: {id: yes/partly/no}. Returns a VisitReview (dict)."""
    lines = [
        f"Write in: {LANGUAGES.get(language, language)}",
        f"Class: Grade {grade}, subject observed: {subject}",
        "",
        "Checklist (id: wording -> rating):",
    ]
    for item_id, item in items.items():
        lines.append(f"- {item_id}: {item['text']['en']} -> {rubric.get(item_id, 'not rated')}")
    lines += ["", "Mentor's notes:", notes.strip() or "(none)"]

    review, _usage = llm.parse(INSTRUCTIONS, "\n".join(lines), VisitReview, effort="low", max_tokens=4000)
    data = review.model_dump()
    # Only keep mismatches about items that are really on this checklist.
    data["mismatches"] = [m for m in data["mismatches"] if m["item_id"] in items]
    return data
