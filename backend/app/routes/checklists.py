"""HTTP endpoints for the state admin's checklist page: view versions, upload a new one, download as CSV."""

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.controllers import checklists as checklists_controller
from app.controllers.auth import require_admin

router = APIRouter(prefix="/api/checklists", tags=["checklists"])


class SuggestIn(BaseModel):
    language: Literal["en", "mr", "hi"] = "en"  # the admin's screen language


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


@router.get("/insights")
def checklist_insights(user=Depends(require_admin)):
    return checklists_controller.checklist_insights(user["state"])


@router.post("/suggestions")
def suggest_items(body: SuggestIn, user=Depends(require_admin)):
    return checklists_controller.suggest_items(user["state"], body.language)


@router.get("/suggestions/csv")
def suggested_csv(user=Depends(require_admin)):
    return csv_response(checklists_controller.suggested_csv(user["state"]), "checklist-suggested-next-version.csv")


@router.get("/{checklist_id}/csv")
def checklist_csv(checklist_id: int, user=Depends(require_admin)):
    return csv_response(checklists_controller.checklist_csv(checklist_id), f"checklist-{checklist_id}.csv")


def csv_response(text, filename):
    return Response(
        content=text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
