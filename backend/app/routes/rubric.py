"""HTTP endpoint for the observation rubric (the mentor's state checklist)."""

from fastapi import APIRouter, Depends

from app.controllers import rubric as rubric_controller
from app.controllers.auth import require_mentor

router = APIRouter(prefix="/api/rubric", tags=["rubric"])


@router.get("")
def get_rubric(user=Depends(require_mentor)):
    return rubric_controller.get_rubric(user)
