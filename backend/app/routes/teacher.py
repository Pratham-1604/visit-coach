"""HTTP endpoint for the teacher's shared link (/t/:token in the app)."""

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.controllers import teacher as teacher_controller

router = APIRouter(prefix="/api/t", tags=["teacher"])


@router.get("/{token}")
def get_shared_packet(token: str, lang: str | None = None):
    return teacher_controller.get_shared_packet(token, english=lang == "en")


@router.get("/{token}/audio")
def get_shared_audio(token: str, lang: str | None = None):
    return FileResponse(teacher_controller.shared_audio(token, english=lang == "en"), media_type="audio/mpeg")
