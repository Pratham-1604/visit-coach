"""HTTP endpoint for the observation rubric."""

from fastapi import APIRouter

from app.controllers import rubric as rubric_controller

router = APIRouter(prefix="/api/rubric", tags=["rubric"])


@router.get("")
def get_rubric():
    return rubric_controller.get_rubric()
