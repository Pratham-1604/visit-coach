"""HTTP endpoint for the next-visit follow-up."""

from fastapi import APIRouter

from app.controllers import followups as followups_controller

router = APIRouter(prefix="/api/followups", tags=["followups"])


@router.post("/{visit_id}")
def record_followup(visit_id: int, followup: followups_controller.FollowUpIn):
    return followups_controller.record_followup(visit_id, followup)
