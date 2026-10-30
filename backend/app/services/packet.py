"""Turn one classroom visit (rubric taps + voice-note transcripts) into a coaching packet.

Every packet is grounded in the FLN knowledge pack (services/knowledge.py) and cites
passage ids from it. The server checks the citations and the chosen rubric item and
practice; if something is off it asks Claude once more.

Try it from the CLI (from backend/, needs ANTHROPIC_API_KEY in .env):
    uv run python -m app.services.packet            # synthetic demo visit
    uv run python -m app.services.packet --twice    # second call should hit the prompt cache
"""

import json
import re
import sys

from pydantic import BaseModel, Field

from app.services import knowledge, llm

LANGUAGES = {"mr": "Marathi", "hi": "Hindi", "ta": "Tamil", "en": "English"}


class CoachingPacket(BaseModel):
    strength: str = Field(description="One specific thing that went well, with what the mentor saw. Teacher's language.")
    priority_rubric_item: str = Field(description="The ONE rubric item id to work on next")
    priority: str = Field(description="What to change and why it matters for children, 2-3 sentences. Teacher's language.")
    practice_id: str = Field(description="Practice library id used, or 'custom' if none fits")
    practice_steps: list[str] = Field(description="3-5 steps for a 5-minute practice tomorrow. Teacher's language.")
    materials: list[str] = Field(description="Materials found in a government classroom. Teacher's language.")
    demo_script: str = Field(description="What the mentor says and does in a 2-minute demo during the debrief. Teacher's language.")
    follow_up: str = Field(description="The one action the teacher agrees to try before the next visit. Teacher's language.")
    follow_up_check: str = Field(description="How the mentor will check it on the next visit. Teacher's language.")
    evidence: list[str] = Field(
        description="For the mentor, in plain English: observations or short quotes from the notes (quotes may stay "
        "in their original language) that support the priority. Name rubric items by their wording, not ids."
    )
    english_gloss: str = Field(
        description="For the mentor, in plain English: 2-3 sentence summary of the packet. Name rubric items by their "
        "wording, not ids. If the notes were thin, say what is missing."
    )
    grounded_in: list[str] = Field(
        description="The 2-4 grounding passage ids from the knowledge pack that most directly support the advice"
    )


# The parts of a packet the teacher reads. Everything else is for the mentor only.
TEACHER_FIELDS = ("strength", "priority", "practice_steps", "materials", "demo_script", "follow_up", "follow_up_check")

# A note addressed to the mentor (CRP), e.g. "[Mentor: add an example here]". Must never reach the teacher.
CRP_NOTE = re.compile(r"\[\s*(CRP|mentor)\b|\b(CRP|mentor)\s*:", re.IGNORECASE)


INSTRUCTIONS = """You are VisitCoach, a coaching assistant for cluster mentors (Kendra Pramukhs in Maharashtra, also \
called CRPs) in Indian government primary schools. A mentor has just observed a Grade 1-3 foundational literacy or numeracy lesson. You turn their \
rubric taps and voice notes into a short coaching packet that the mentor reviews, edits and then shares with the teacher.

Coaching rules:
- Start from a real strength the mentor saw. Be specific: name what the teacher did and how children responded.
- Pick exactly ONE priority: the rubric item that would most help children learn, preferring items rated "no" or \
"partly" that the notes back up. Do not list other weaknesses.
- Never score, grade or rank the teacher. This is coaching between colleagues, not inspection.
- The practice must take about 5 minutes, use only materials a government classroom has, and suit the class. \
Prefer a practice from the library and adapt it to the lesson the mentor saw; use "custom" only if none fits.
- The demo script is what the mentor will say and do with the teacher in 2 minutes; write it as spoken words and actions.
- The follow-up is one small, checkable action, with a simple way for the mentor to check it next visit.
- If coaching history is given, treat it as one continuing plan, even when earlier visits were by other mentors. Mention progress on the most recent action where the notes allow. Never set again an action that was already done; if an action was not done, make the new one smaller and easier rather than repeating it.
- If several grades sit together, choose a practice that works across levels (e.g. group children by level, or pair an older child with a younger one) and say in practice_steps how to split the class. Fit the practice to the number of children present.
- Rubric taps and notes can disagree. Trust the specific detail in the notes, and mention the mismatch in evidence.
- If the notes are too thin to support a point, never invent observations: keep the teacher's text general and say \
what is missing in english_gloss.
- strength, priority, practice_steps, materials, demo_script, follow_up and follow_up_check are shared with the \
teacher. Write them in the teacher's language, in simple everyday words a teacher would use. Never put notes, \
questions or placeholders meant for the mentor in them (nothing like "[Mentor: add an example]").
- Use wording that does not depend on the gender of the mentor or the teacher (plural, polite or passive forms). Never \
write alternatives such as "करूँगा/करूँगी".
- Never use children's names, not even made-up ones. Say "one child", "the first child", "a child in the back row".
- evidence and english_gloss are for the mentor: write them in plain English. Name rubric items by their wording, \
never by their ids.
- Keep priority_rubric_item and practice_id exactly as the ids given.
- grounded_in lists the 2-4 passage ids from the "Grounding passages" section below that most directly support \
your advice."""


def system_prompt():
    return f"{INSTRUCTIONS}\n\n{knowledge.pack_text()}"


def visit_prompt(visit):
    """The per-visit part of the request (everything that changes between calls)."""
    items = knowledge.rubric_items()
    language = LANGUAGES.get(visit["language"], visit["language"])
    lines = [
        f"Teacher's language: {language}",
        f"Class: {visit['grade']}",
        f"Subject observed: {visit['subject']}",
    ]
    if visit.get("grades_together") and len(visit["grades_together"]) > 1:
        grades = ", ".join(str(grade) for grade in visit["grades_together"])
        lines.append(f"Grades sitting together in this class: {grades} (multi-grade)")
    if visit.get("children_present"):
        lines.append(f"Children present: {visit['children_present']}")
    lines += ["", "Rubric taps:"]
    for item_id, rating in visit.get("rubric", {}).items():
        if item_id in items:
            lines.append(f"- {item_id} ({items[item_id]['text']['en']}): {rating}")

    lines += ["", "Mentor voice notes (transcripts, may be code-mixed):"]
    notes = [note for note in visit.get("notes", []) if note.strip()]
    lines += [f"{n}. {note}" for n, note in enumerate(notes, 1)] or ["(none)"]

    if visit.get("previous_actions"):
        lines += ["", "Coaching history with this teacher (most recent first, possibly from other mentors):"]
        lines += [f"- {action}" for action in visit["previous_actions"]]

    lines += ["", "Write the coaching packet."]
    return "\n".join(lines)


def check_packet(packet):
    """Return a list of problems with Claude's packet (empty list = fine)."""
    problems = []
    if packet.priority_rubric_item not in knowledge.rubric_items():
        problems.append(f"priority_rubric_item '{packet.priority_rubric_item}' is not a rubric item id")
    if packet.practice_id != "custom" and packet.practice_id not in knowledge.practices():
        problems.append(f"practice_id '{packet.practice_id}' is not in the practice library")
    unknown = [pid for pid in packet.grounded_in if pid not in knowledge.passages()]
    if unknown:
        problems.append(f"grounded_in has unknown passage ids: {', '.join(unknown)}")
    if not packet.grounded_in:
        problems.append("grounded_in is empty")
    for field in crp_notes_in(packet.model_dump()):
        problems.append(f"{field} is shared with the teacher but contains a note for the mentor; move it to english_gloss")
    return problems


def crp_notes_in(packet):
    """Teacher-facing fields that still contain a note meant for the mentor."""
    found = []
    for field in TEACHER_FIELDS:
        value = packet.get(field) or ""
        text = " ".join(value) if isinstance(value, list) else value
        if CRP_NOTE.search(text):
            found.append(field)
    return found


def readable_ids(text):
    """Swap rubric ids (e.g. children_read) for their wording, in text meant for the mentor."""
    for item_id, item in knowledge.rubric_items().items():
        text = re.sub(rf"\b{item_id}\b", f'"{item["text"]["en"]}"', text)
    return text


def generate_packet(visit):
    """Build a coaching packet for one visit. Returns (packet dict, usage list)."""
    system = system_prompt()
    user = visit_prompt(visit)
    packet, usage = llm.parse(system, user, CoachingPacket)
    usages = [usage]

    problems = check_packet(packet)
    if problems:
        retry = f"{user}\n\nYour previous packet had problems; fix them:\n- " + "\n- ".join(problems)
        packet, usage = llm.parse(system, retry, CoachingPacket)
        usages.append(usage)
        problems = check_packet(packet)
        if problems:
            raise llm.LLMError("Packet failed checks twice: " + "; ".join(problems))

    return with_details(packet), usages


def with_details(packet):
    """Add what the app needs that Claude shouldn't decide: need area and source labels."""
    item = knowledge.rubric_items()[packet.priority_rubric_item]
    data = packet.model_dump()
    data["english_gloss"] = readable_ids(data["english_gloss"])
    data["evidence"] = [readable_ids(line) for line in data["evidence"]]
    data["need_area"] = item["need_area"]
    data["sources"] = [knowledge.source_label(pid) for pid in packet.grounded_in]
    return data


# Synthetic demo visit (no real teacher or children): Grade 2 Marathi literacy lesson.
DEMO_VISIT = {
    "language": "mr",
    "grade": 2,
    "subject": "literacy",
    "rubric": {
        "home_language": "yes",
        "print_rich": "partly",
        "read_aloud_talk": "partly",
        "sounds_aksharas": "partly",
        "children_read": "no",
        "every_child_turn": "no",
        "pair_group_work": "no",
        "encouraging_feedback": "yes",
        "understanding_questions": "no",
    },
    "notes": [
        "Teacher read the textbook lesson aloud and the whole class repeated each line after her, three times. "
        "Only about five children in the front row were looking at the book.",
        "पाठ वाचताना मागच्या बाकावरची मुले फक्त ओठ हलवत होती, स्वतः वाचत नव्हती. कोणालाही एकट्याने वाचायला सांगितले नाही.",
        "Good start: she showed a big picture chart of a village market and children named everything in it "
        "very excitedly, some in their home words, and she praised every answer.",
    ],
}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    runs = 2 if "--twice" in sys.argv else 1
    for _ in range(runs):
        try:
            packet, usages = generate_packet(DEMO_VISIT)
        except llm.LLMError as err:
            sys.exit(f"Could not generate packet: {err}")
        print(json.dumps(packet, ensure_ascii=False, indent=2))
        for usage in usages:
            print(json.dumps(usage), file=sys.stderr)


if __name__ == "__main__":
    main()
