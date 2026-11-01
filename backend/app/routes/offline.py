"""HTTP endpoint for the offline pack."""

from fastapi import APIRouter, Depends

from app.controllers import offline as offline_controller
from app.controllers.auth import require_mentor

router = APIRouter(prefix="/api/offline-pack", tags=["offline"])


@router.get("")
def offline_pack(user=Depends(require_mentor)):
    return offline_controller.offline_pack(user)
