"""The teacher's view of an approved packet, opened from the link the CRP shares.

Only the parts written for the teacher leave the server: no transcripts, evidence,
sources or English summary for the CRP. The same notes can be listened to as audio.
"""

import json

from fastapi import HTTPException

from app import config, db
from app.controllers.history import teacher_history
from app.services import tts
from app.services.packet import TEACHER_FIELDS

# The parts of the history the teacher sees: no notes the mentor wrote at the check.
HISTORY_FIELDS = ("date", "mentor_name", "focus", "follow_up", "result")


# What the audio reads, in the order of the teacher's page. Headings match frontend/src/lib/labels.js.
SPOKEN_FIELDS = ("strength", "priority", "practice_steps", "materials", "follow_up", "follow_up_check")
SPOKEN_HEADINGS = {
    "en": {
        "title": "Notes from your class visit",
        "strength": "What went well",
        "priority": "One thing to work on",
        "practice_steps": "5-minute practice for tomorrow",
        "materials": "Materials",
        "follow_up": "What we agreed before the next visit",
        "follow_up_check": "How we will look at it next time",
    },
    "hi": {
        "title": "आपकी कक्षा की मुलाक़ात के नोट्स",
        "strength": "क्या अच्छा रहा",
        "priority": "एक चीज़ जिस पर काम करें",
        "practice_steps": "कल के लिए 5 मिनट का अभ्यास",
        "materials": "सामग्री",
        "follow_up": "अगली मुलाक़ात तक हमने क्या तय किया",
        "follow_up_check": "अगली बार हम इसे कैसे देखेंगे",
    },
    "mr": {
        "title": "तुमच्या वर्ग भेटीच्या नोंदी",
        "strength": "काय छान झाले",
        "priority": "लक्ष देण्यासारखी एक गोष्ट",
        "practice_steps": "उद्यासाठी ५ मिनिटांचा सराव",
        "materials": "साहित्य",
        "follow_up": "पुढच्या भेटीपर्यंत आपण काय ठरवले",
        "follow_up_check": "पुढच्या वेळी आपण हे कसे पाहू",
    },
    "ta": {
        "title": "உங்கள் வகுப்பு வருகைக் குறிப்புகள்",
        "strength": "நன்றாக நடந்தது",
        "priority": "கவனம் செலுத்த வேண்டிய ஒன்று",
        "practice_steps": "நாளைக்கான 5 நிமிடப் பயிற்சி",
        "materials": "தேவையான பொருட்கள்",
        "follow_up": "அடுத்த வருகை வரை நாம் ஒப்புக்கொண்டது",
        "follow_up_check": "அடுத்த முறை இதை எப்படிப் பார்ப்போம்",
    },
}


def approved_packet(token):
    row = db.query_one(
        "SELECT p.edited_json, p.original_json, p.approved_at, v.id AS visit_id, v.teacher_id, v.mentor_name,"
        " v.language, t.name AS teacher_name,"
        " t.grade, s.name AS school_name"
        " FROM packets p JOIN visits v ON v.id = p.visit_id"
        " JOIN teachers t ON t.id = v.teacher_id JOIN schools s ON s.id = v.school_id"
        " WHERE p.share_token = ? AND p.approved_at IS NOT NULL",
        (token,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="This link is not valid")
    return row, json.loads(row["edited_json"] or row["original_json"])


def get_shared_packet(token):
    row, packet = approved_packet(token)
    earlier = [
        {field: entry[field] for field in HISTORY_FIELDS}
        for entry in teacher_history(row["teacher_id"])
        if entry["visit_id"] < row["visit_id"]
    ]
    return {
        "school_name": row["school_name"],
        "teacher_first_name": row["teacher_name"].split()[0],
        "grade": row["grade"],
        "language": row["language"],
        "approved_at": row["approved_at"],
        "mentor_name": row["mentor_name"],
        "packet": {field: packet.get(field) for field in TEACHER_FIELDS},
        "history": earlier,
    }


def shared_audio(token):
    """Path to the MP3 of the approved notes, made once with Sarvam. An approved packet can't change, so it is kept."""
    row, packet = approved_packet(token)
    path = config.AUDIO_DIR / f"{token}.mp3"
    if not path.exists():
        try:
            audio = tts.speak(spoken_text(packet, row["language"]), row["language"])
        except tts.TTSError as err:
            raise HTTPException(status_code=503, detail=str(err)) from err
        config.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        partial = path.with_suffix(".part")
        partial.write_bytes(audio)
        partial.replace(path)
    return path


def prepare_audio(token):
    """Make the audio right after approval, so it is ready when the mentor or teacher presses play."""
    try:
        shared_audio(token)
    except HTTPException:
        pass  # made again on the first play


def spoken_text(packet, language):
    """The teacher's page as one script: each heading, then its text; lists read as numbered steps."""
    headings = SPOKEN_HEADINGS.get(language, SPOKEN_HEADINGS["en"])
    paragraphs = [f"{headings['title']}."]
    for field in SPOKEN_FIELDS:
        value = packet.get(field)
        if not value:
            continue
        if isinstance(value, list):
            value = "\n".join(f"{index}. {line}" for index, line in enumerate(value, start=1))
        paragraphs.append(f"{headings[field]}.\n{value}")
    return "\n\n".join(paragraphs)
