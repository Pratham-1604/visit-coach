"""HTTP endpoint for the offline pack."""

from fastapi import APIRouter

from app.controllers import offline as offline_controller

router = APIRouter(prefix="/api/offline-pack", tags=["offline"])


@router.get("")
def offline_pack():
    return offline_controller.offline_pack()
