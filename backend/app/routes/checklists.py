"""HTTP endpoints for the state admin's checklist page: view versions, upload a new one, download as CSV."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response

from app.controllers import checklists as checklists_controller
from app.controllers.auth import require_admin

router = APIRouter(prefix="/api/checklists", tags=["checklists"])


@router.get("")
def checklist_overview(user=Depends(require_admin)):
    return checklists_controller.checklist_overview(user["state"])


@router.post("")
async def upload_checklist(
    file: UploadFile = File(...),
    name: str = Form(default=""),
    note: str = Form(default=""),
    user=Depends(require_admin),
):
    data = await file.read()
    return checklists_controller.upload_checklist(user["state"], file.filename or "", data, name, note, user)


@router.get("/{checklist_id}/csv")
def checklist_csv(checklist_id: int, user=Depends(require_admin)):
    return Response(
        content=checklists_controller.checklist_csv(checklist_id),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="checklist-{checklist_id}.csv"'},
    )
