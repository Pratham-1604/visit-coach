"""HTTP endpoints for rehearsing the debrief (online only)."""

from fastapi import APIRouter

from app.controllers import rehearsal as rehearsal_controller

router = APIRouter(prefix="/api/rehearsal", tags=["rehearsal"])


@router.post("/{visit_id}/turn")
def take_turn(visit_id: int, body: rehearsal_controller.RehearsalIn):
    return rehearsal_controller.take_turn(visit_id, body)


@router.post("/{visit_id}/score")
def score(visit_id: int, body: rehearsal_controller.RehearsalIn):
    return rehearsal_controller.score(visit_id, body)
