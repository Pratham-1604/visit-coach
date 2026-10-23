"""HTTP endpoints for schools. Routes stay thin: they only call controllers."""

from fastapi import APIRouter

from app.controllers import schools as schools_controller

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("")
def list_schools():
    return schools_controller.list_schools()


@router.get("/{school_id}")
def get_school(school_id: int):
    return schools_controller.get_school(school_id)
