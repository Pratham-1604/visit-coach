"""Visit logic: accept a visit synced from the phone, then turn it into a coaching packet.

Pipeline (runs as a background task after the sync request returns):
    queued → transcribing (Sarvam, one call per voice note) → generating (Claude) → ready
Any error sets status = failed with a message; the mentor can retry.

Then the mentor reviews the packet: edits are saved next to Claude's original (to measure the
edit rate), and approving it locks the packet and creates the teacher's share token.
"""

import json
import logging
import secrets
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app import config, db
from app.services import asr, llm
from app.controllers.history import previous_actions
from app.services.packet import crp_notes_in, generate_packet

log = logging.getLogger(__name__)

PENDING = ("queued", "transcribing", "generating")

AUDIO_EXTENSIONS = {"audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav"}


class VisitIn(BaseModel):
    """What the phone sends: the visit as saved in IndexedDB."""

    client_id: str
    school_id: int
    teacher_id: int
    subject: Literal["literacy", "numeracy"]
    rubric: dict[str, Literal["yes", "partly", "no"]] = {}
    typed_note: str = ""
    observed_at: str | None = None
    mentor_name: str = Field(default="", max_length=80)
    children_present: int | None = Field(default=None, ge=0, le=200)
    grades_together: list[int] = Field(default=[], max_length=8)


class PacketEdits(BaseModel):
    """The parts of a packet the mentor may change. Evidence, sources and ids stay as Claude wrote them."""

    strength: str
    priority: str
    practice_steps: list[str]
    materials: list[str]
    demo_script: str
    follow_up: str
    follow_up_check: str


def sync_visit(visit_in, notes):
    """Save a visit and its voice notes. Safe to retry: the same client_id returns the same visit.

    `notes` is a list of (bytes, mime). Returns (visit, needs_processing).
    """
    existing = db.query_one("SELECT id FROM visits WHERE client_id = ?", (visit_in.client_id,))
    if existing:
        return get_visit(existing["id"]), False

    teacher = db.query_one(
        "SELECT t.id, s.language FROM teachers t JOIN schools s ON s.id = t.school_id"
        " WHERE t.id = ? AND t.school_id = ?",
        (visit_in.teacher_id, visit_in.school_id),
    )
    if not teacher:
        raise HTTPException(status_code=400, detail="Unknown school or teacher")

    visit_id = db.execute(
        "INSERT INTO visits (client_id, school_id, teacher_id, subject, language, rubric_json,"
        " typed_note, mentor_name, children_present, grades_together, observed_at, status)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')",
        (
            visit_in.client_id,
            visit_in.school_id,
            visit_in.teacher_id,
            visit_in.subject,
            teacher["language"],
            json.dumps(visit_in.rubric),
            visit_in.typed_note.strip(),
            visit_in.mentor_name.strip() or None,
            visit_in.children_present,
            json.dumps(sorted(set(visit_in.grades_together))),
            visit_in.observed_at,
        ),
    )

    folder = config.UPLOAD_DIR / str(visit_id)
    folder.mkdir(parents=True, exist_ok=True)
    for number, (audio, mime) in enumerate(notes, 1):
        base_mime = mime.split(";")[0]
        path = folder / f"{number}.{AUDIO_EXTENSIONS.get(base_mime, 'webm')}"
        path.write_bytes(audio)
        db.execute(
            "INSERT INTO voice_notes (visit_id, audio_path, mime) VALUES (?, ?, ?)",
            (visit_id, str(path), base_mime),
        )

    return get_visit(visit_id), True


def retry_visit(visit_id):
    visit = db.query_one("SELECT status FROM visits WHERE id = ?", (visit_id,))
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit["status"] != "failed":
        raise HTTPException(status_code=409, detail=f"Visit is {visit['status']}, not failed")
    set_status(visit_id, "queued")
    return get_visit(visit_id)


def process_visit(visit_id):
    """Transcribe the voice notes, then generate the packet. Runs in the background."""
    try:
        visit = db.query_one(
            "SELECT v.*, t.grade FROM visits v JOIN teachers t ON t.id = v.teacher_id WHERE v.id = ?",
            (visit_id,),
        )

        set_status(visit_id, "transcribing")
        notes = db.query("SELECT * FROM voice_notes WHERE visit_id = ? ORDER BY id", (visit_id,))
        for note in notes:
            if note["transcript"] is None:  # already done on an earlier try
                transcript = asr.transcribe(note["audio_path"], visit["language"], note["mime"] or "audio/webm")
                db.execute("UPDATE voice_notes SET transcript = ? WHERE id = ?", (transcript, note["id"]))
                note["transcript"] = transcript

        set_status(visit_id, "generating")
        texts = [note["transcript"] for note in notes]
        if visit["typed_note"]:
            texts.append(visit["typed_note"])
        packet, usages = generate_packet(
            {
                "language": visit["language"],
                "grade": visit["grade"],
                "subject": visit["subject"],
                "rubric": json.loads(visit["rubric_json"] or "{}"),
                "notes": texts,
                "children_present": visit["children_present"],
                "grades_together": json.loads(visit["grades_together"] or "[]"),
                "previous_actions": previous_actions(visit["teacher_id"], visit_id),
            }
        )
        log.info("Packet for visit %s: %s", visit_id, usages)

        db.execute(
            "INSERT INTO packets (visit_id, original_json) VALUES (?, ?)"
            " ON CONFLICT(visit_id) DO UPDATE SET original_json = excluded.original_json",
            (visit_id, json.dumps(packet, ensure_ascii=False)),
        )
        set_status(visit_id, "ready")
    except (asr.ASRError, llm.LLMError) as err:
        set_status(visit_id, "failed", str(err))
    except Exception as err:
        log.exception("Visit %s failed", visit_id)
        set_status(visit_id, "failed", f"Unexpected error: {err}")


def save_packet_edits(visit_id, edits):
    packet = editable_packet(visit_id)
    edited = {**current_packet(packet), **edits.model_dump()}
    edited["practice_steps"] = [step.strip() for step in edited["practice_steps"] if step.strip()]
    edited["materials"] = [item.strip() for item in edited["materials"] if item.strip()]
    db.execute(
        "UPDATE packets SET edited_json = ? WHERE visit_id = ?",
        (json.dumps(edited, ensure_ascii=False), visit_id),
    )
    return get_visit(visit_id)


def approve_visit(visit_id):
    """Lock the packet and create the token for the teacher's link."""
    packet = editable_packet(visit_id)
    leftover = crp_notes_in(current_packet(packet))
    if leftover:
        raise HTTPException(
            status_code=409,
            detail=f"Remove the note for the mentor before sharing (in: {', '.join(leftover)})",
        )
    db.execute(
        "UPDATE packets SET share_token = ?, approved_at = CURRENT_TIMESTAMP WHERE visit_id = ?",
        (secrets.token_urlsafe(9), visit_id),
    )
    set_status(visit_id, "approved")
    return get_visit(visit_id)


def editable_packet(visit_id):
    """The packet row, if the visit is ready for review and not yet approved."""
    visit = db.query_one("SELECT status FROM visits WHERE id = ?", (visit_id,))
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit["status"] != "ready":
        raise HTTPException(status_code=409, detail=f"Visit is {visit['status']}, packet cannot be changed")
    return db.query_one("SELECT * FROM packets WHERE visit_id = ?", (visit_id,))


def current_packet(packet):
    """What the mentor last saw: their edits if any, else Claude's original."""
    return json.loads(packet["edited_json"] or packet["original_json"])


def fail_interrupted():
    """On startup: visits left mid-pipeline by a restart will never finish, so mark them failed."""
    db.execute(
        "UPDATE visits SET status = 'failed', error = 'Interrupted by a server restart'"
        f" WHERE status IN ({', '.join('?' * len(PENDING))})",
        PENDING,
    )


def get_visit(visit_id):
    visit = db.query_one(
        "SELECT v.id, v.client_id, v.school_id, v.teacher_id, v.subject, v.language, v.rubric_json,"
        " v.typed_note, v.mentor_name, v.children_present, v.grades_together, v.observed_at,"
        " v.status, v.error, v.created_at,"
        " t.name AS teacher_name, t.grade, s.name AS school_name"
        " FROM visits v JOIN teachers t ON t.id = v.teacher_id JOIN schools s ON s.id = v.school_id"
        " WHERE v.id = ?",
        (visit_id,),
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    visit["rubric"] = json.loads(visit.pop("rubric_json") or "{}")
    visit["grades_together"] = json.loads(visit["grades_together"] or "[]")
    visit["notes"] = db.query(
        "SELECT id, transcript FROM voice_notes WHERE visit_id = ? ORDER BY id", (visit_id,)
    )
    packet = db.query_one("SELECT * FROM packets WHERE visit_id = ?", (visit_id,))
    visit["packet"] = current_packet(packet) if packet else None
    visit["packet_edited"] = bool(packet and packet["edited_json"])
    visit["share_token"] = packet["share_token"] if packet else None
    visit["approved_at"] = packet["approved_at"] if packet else None
    return visit


def set_status(visit_id, status, error=None):
    db.execute("UPDATE visits SET status = ?, error = ? WHERE id = ?", (status, error, visit_id))
