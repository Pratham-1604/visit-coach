"""Turn one classroom visit (rubric taps + voice-note transcripts) into a coaching packet.

Every packet is grounded in the FLN knowledge pack (services/knowledge.py) and cites
passage ids from it. The server checks the citations and the chosen rubric item and
practice; if something is off it asks Claude once more.

Try it from the CLI (from backend/, needs ANTHROPIC_API_KEY in .env):
    uv run python -m app.services.packet            # synthetic demo visit
    uv run python -m app.services.packet --twice    # second call should hit the prompt cache
"""

import json
import sys

from pydantic import BaseModel, Field

from app.services import knowledge, llm

LANGUAGES = {"mr": "Marathi", "hi": "Hindi", "ta": "Tamil", "en": "English"}


class CoachingPacket(BaseModel):
    strength: str = Field(description="One specific thing that went well, with what the CRP saw. Teacher's language.")
    priority_rubric_item: str = Field(description="The ONE rubric item id to work on next")
    priority: str = Field(description="What to change and why it matters for children, 2-3 sentences. Teacher's language.")
    practice_id: str = Field(description="Practice library id used, or 'custom' if none fits")
    practice_steps: list[str] = Field(description="3-5 steps for a 5-minute practice tomorrow. Teacher's language.")
    materials: list[str] = Field(description="Materials found in a government classroom. Teacher's language.")
    demo_script: str = Field(description="What the CRP says and does in a 2-minute demo during the debrief. Teacher's language.")
    follow_up: str = Field(description="The one action the teacher agrees to try before the next visit. Teacher's language.")
    follow_up_check: str = Field(description="How the CRP will check it on the next visit. Teacher's language.")
    evidence: list[str] = Field(description="Observations or short quotes from the notes that support the priority")
    english_gloss: str = Field(description="2-3 sentence English summary of the packet for the CRP")
    grounded_in: list[str] = Field(description="Grounding passage ids from the knowledge pack that support the advice")


INSTRUCTIONS = """You are VisitCoach, a coaching assistant for Cluster Resource Persons (CRPs) in Indian government \
primary schools. A CRP has just observed a Grade 1-3 foundational literacy or numeracy lesson. You turn their \
rubric taps and voice notes into a short coaching packet that the CRP reviews, edits and then shares with the teacher.

Coaching rules:
- Start from a real strength the CRP saw. Be specific: name what the teacher did and how children responded.
- Pick exactly ONE priority: the rubric item that would most help children learn, preferring items rated "no" or \
"partly" that the notes back up. Do not list other weaknesses.
- Never score, grade or rank the teacher. This is coaching between colleagues, not inspection.
- The practice must take about 5 minutes, use only materials a government classroom has, and suit the class. \
Prefer a practice from the library and adapt it to the lesson the CRP saw; use "custom" only if none fits.
- The demo script is what the CRP will say and do with the teacher in 2 minutes; write it as spoken words and actions.
- The follow-up is one small, checkable action, with a simple way for the CRP to check it next visit.
- If a previous action is given, mention progress on it where the notes allow.
- Rubric taps and notes can disagree. Trust the specific detail in the notes, and mention the mismatch in evidence.
- If the notes are too thin to support a point, say so in evidence instead of inventing observations.
- Write strength, priority, practice_steps, materials, demo_script, follow_up and follow_up_check in the teacher's \
language, in simple everyday words a teacher would use. Keep rubric ids and practice ids exactly as given.
- english_gloss is always in English.
- grounded_in lists only passage ids from the "Grounding passages" section below that actually support your advice."""


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
        "",
        "Rubric taps:",
    ]
    for item_id, rating in visit.get("rubric", {}).items():
        if item_id in items:
            lines.append(f"- {item_id} ({items[item_id]['text']['en']}): {rating}")

    lines += ["", "CRP voice notes (transcripts, may be code-mixed):"]
    notes = [note for note in visit.get("notes", []) if note.strip()]
    lines += [f"{n}. {note}" for n, note in enumerate(notes, 1)] or ["(none)"]

    if visit.get("previous_action"):
        lines += ["", f"Action agreed at the previous visit: {visit['previous_action']}"]

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
    return problems


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
