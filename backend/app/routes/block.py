"""HTTP endpoint for the block officer's summary."""

from fastapi import APIRouter

from app.controllers import block as block_controller

router = APIRouter(prefix="/api/block", tags=["block"])


@router.get("/summary")
def block_summary():
    return block_controller.block_summary()
