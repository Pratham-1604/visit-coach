"""HTTP endpoints for the visit report: read it, write it with Claude, mark it as sent."""

from fastapi import APIRouter

from app.controllers import reports as reports_controller

router = APIRouter(prefix="/api/visits/{visit_id}/report", tags=["reports"])


@router.get("")
def report_view(visit_id: int):
    return reports_controller.report_view(visit_id)


@router.post("")
def write_report(visit_id: int, report_in: reports_controller.ReportIn):
    return reports_controller.write_report(visit_id, report_in)


@router.post("/sent")
def mark_sent(visit_id: int):
    return reports_controller.mark_sent(visit_id)
