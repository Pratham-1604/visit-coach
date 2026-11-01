"""The visit report: the record a mentor would otherwise write by hand after every visit.

Claude writes the parts that need judgement (summary, observations, points to check, support needed)
from the checklist ratings, all the notes and the agreed action. Facts (school, ratings, the action)
are shown by the app straight from the data, so Claude can't get them wrong.
"""

from pydantic import BaseModel, Field

from app.services import llm
from app.services.packet import LANGUAGES


class VisitReport(BaseModel):
    summary: str = Field(
        description="3-5 sentences: what the mentor saw in this lesson. Factual and kind; describes the teaching, "
        "never scores or ranks the teacher."
    )
    observations: list[str] = Field(description="3-6 key observations from the notes and ratings, one sentence each")
    flags: list[str] = Field(
        description="Points that need attention or a second look: ratings the notes contradict, important items not "
        "rated, and any child safety, attendance or missing-material issue. Empty if none."
    )
    support_needed: list[str] = Field(
        description="Help the school or teacher needs from the cluster or block (materials, training, staff). "
        "Empty if none."
    )


INSTRUCTIONS = """You write the classroom visit report for a cluster mentor (Kendra Pramukh) in an Indian government \
primary school, Grades 1-3. The mentor reads it, then sends it as the record of the visit (for example to the \
block office). It replaces the report the mentor would otherwise write by hand.

Rules:
- Use only what is in the ratings and notes. Never invent observations. If the notes are thin, say so in the summary.
- This is mentoring, not inspection: describe what happened in the class and what would help, never judge or \
score the teacher.
- Never use children's names. Say "one child", "children in the back row".
- Flag anything important: ratings the notes contradict, key items left unrated, child safety, attendance or \
missing materials.
- Write every field in the language you are asked to use, in simple, formal words suitable for an official record."""


def write_report(visit, items, rubric, notes, follow_up, previous_actions, language):
    """visit: the visit row with grade/teacher; items: {id: checklist item}. Returns the report as a dict."""
    lines = [
        f"Write in: {LANGUAGES.get(language, language)}",
        f"Class: Grade {visit['grade']}, subject observed: {visit['subject']}",
    ]
    if visit.get("children_present"):
        lines.append(f"Children present: {visit['children_present']}")
    if len(visit.get("grades_together") or []) > 1:
        lines.append(f"Grades sitting together: {', '.join(str(g) for g in visit['grades_together'])}")
    lines += ["", "Checklist (id: wording -> rating):"]
    for item_id, item in items.items():
        lines.append(f"- {item_id}: {item['text']['en']} -> {rubric.get(item_id, 'not rated')}")
    lines += ["", "Mentor's notes (typed, and voice notes as transcribed; may be code-mixed):"]
    lines += [f"{n}. {note}" for n, note in enumerate(notes, 1)] or ["(none)"]
    if follow_up:
        lines += ["", f"Action agreed with the teacher for the next visit: {follow_up}"]
    if previous_actions:
        lines += ["", "Earlier agreed actions and what was found:"] + [f"- {action}" for action in previous_actions]
    lines += ["", "Write the visit report."]

    report, _usage = llm.parse(INSTRUCTIONS, "\n".join(lines), VisitReport, effort="low", max_tokens=8000)
    return report.model_dump()
