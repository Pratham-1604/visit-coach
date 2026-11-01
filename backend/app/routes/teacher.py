"""HTTP endpoint for the teacher's shared link (/t/:token in the app)."""

from fastapi import APIRouter

from app.controllers import teacher as teacher_controller

router = APIRouter(prefix="/api/t", tags=["teacher"])


@router.get("/{token}")
def get_shared_packet(token: str):
    return teacher_controller.get_shared_packet(token)
