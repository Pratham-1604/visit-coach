"""HTTP endpoints for visits: sync from the phone, poll status, retry, review the packet."""

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.controllers import visits as visits_controller

router = APIRouter(prefix="/api/visits", tags=["visits"])


@router.post("/sync")
async def sync_visit(background: BackgroundTasks, visit: str = Form(...), notes: list[UploadFile] = File(default=[])):
    """Multipart: `visit` is the visit JSON, `notes` are the voice-note audio files in order."""
    try:
        visit_in = visits_controller.VisitIn.model_validate_json(visit)
    except ValidationError as err:
        raise HTTPException(status_code=422, detail=err.errors(include_url=False)) from err

    audio = [(await note.read(), note.content_type or "audio/webm") for note in notes]
    result, needs_processing = visits_controller.sync_visit(visit_in, audio)
    if needs_processing:
        background.add_task(visits_controller.process_visit, result["id"])
    return result


@router.get("/{visit_id}")
def get_visit(visit_id: int):
    return visits_controller.get_visit(visit_id)


@router.post("/{visit_id}/retry")
def retry_visit(visit_id: int, background: BackgroundTasks):
    result = visits_controller.retry_visit(visit_id)
    background.add_task(visits_controller.process_visit, visit_id)
    return result


@router.put("/{visit_id}/packet")
def save_packet_edits(visit_id: int, edits: visits_controller.PacketEdits):
    return visits_controller.save_packet_edits(visit_id, edits)


@router.post("/{visit_id}/approve")
def approve_visit(visit_id: int):
    return visits_controller.approve_visit(visit_id)
