"""Rehearsal: the CRP practises the debrief while Claude plays the teacher, then gets feedback.

Each turn is one standalone call: the packet and the conversation so far go in as text,
the teacher's next line comes out. Nothing is stored on the server.
"""

from pydantic import BaseModel, Field

from app.services import llm
from app.services.packet import LANGUAGES

MAX_TURNS = 16  # lines in a conversation; a debrief rehearsal is short


class TeacherReply(BaseModel):
    reply: str = Field(description="The teacher's next spoken line, 1-3 sentences, in the conversation's language")


class Criterion(BaseModel):
    score: int = Field(description="1 = missing, 2 = weak, 3 = good, 4 = excellent")
    comment: str = Field(description="One sentence in plain English, quoting the mentor where useful")


class RehearsalScore(BaseModel):
    specific: Criterion = Field(description="Did the mentor talk about specific things seen in class, not generalities?")
    strength_first: Criterion = Field(description="Did the mentor open with a genuine, specific strength?")
    one_priority: Criterion = Field(description="Did the mentor stay on one priority instead of listing problems?")
    invites_teacher: Criterion = Field(description="Did the mentor ask questions and listen to the teacher's view?")
    agreed_action: Criterion = Field(description="Did they end with one small, concrete action both agree on?")
    overall_tip: str = Field(description="The single most useful tip for next time, in plain English")
    better_line: str = Field(description="A better version of the mentor's weakest line, in the conversation's language")


TEACHER_INSTRUCTIONS = """You are role-playing a Grade 1-3 government school teacher in India, so that a cluster \
mentor (a Kendra Pramukh or CRP) can practise giving feedback after a classroom visit. Stay in character.

How you behave:
- You start a little defensive and tired: a big class, syllabus pressure, many non-teaching duties.
- You soften when the mentor opens with a genuine, specific strength, asks your view, and keeps to one small step.
- You push back politely when the mentor is vague, lectures, lists many problems, or sounds like an inspector.
- You never invent a different classroom: you remember the lesson the mentor watched, as described in the packet.
- Speak naturally, 1-3 sentences, in the given language. No stage directions, no lists, no English unless the \
language is English."""

SCORE_INSTRUCTIONS = """You coach cluster mentors (Kendra Pramukhs, CRPs) on how they give feedback to teachers after a \
classroom visit. Good feedback: starts from a specific strength, talks about what was actually seen, keeps to \
one priority, asks the teacher's view and listens, and ends with one small action both agree on. Score only the \
mentor's lines. Be honest and kind; the mentor is learning."""


def describe_packet(packet):
    steps = "; ".join(packet.get("practice_steps") or [])
    return "\n".join(
        [
            f"What went well: {packet.get('strength', '')}",
            f"The one priority: {packet.get('priority', '')}",
            f"Suggested 5-minute practice: {steps}",
            f"Action the mentor hopes to agree: {packet.get('follow_up', '')}",
        ]
    )


def transcript(history, teacher_name):
    names = {"crp": "Mentor", "teacher": teacher_name}
    return "\n".join(f"{names[line['role']]}: {line['text']}" for line in history) or "(nothing said yet)"


def teacher_reply(packet, language, grade, teacher_name, history):
    user = "\n\n".join(
        [
            f"You are {teacher_name}, Grade {grade} teacher. Language: {LANGUAGES.get(language, language)}.",
            f"The mentor's coaching packet from your class (you have not seen it):\n{describe_packet(packet)}",
            f"Conversation so far:\n{transcript(history, teacher_name)}",
            "Reply with your next line as the teacher.",
        ]
    )
    reply, _usage = llm.parse(TEACHER_INSTRUCTIONS, user, TeacherReply, effort="low", max_tokens=4000)
    return reply.reply.strip()


def score_rehearsal(packet, language, teacher_name, history):
    user = "\n\n".join(
        [
            f"Language of the conversation: {LANGUAGES.get(language, language)}.",
            f"What the mentor wanted to convey:\n{describe_packet(packet)}",
            f"The rehearsal:\n{transcript(history, teacher_name)}",
            "Score the mentor.",
        ]
    )
    score, _usage = llm.parse(SCORE_INSTRUCTIONS, user, RehearsalScore, effort="medium")
    data = score.model_dump()
    for key in ("specific", "strength_first", "one_priority", "invites_teacher", "agreed_action"):
        data[key]["score"] = max(1, min(4, data[key]["score"]))
    return data
