from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.template import (
    TemplateCreate,
    TemplateListResponse,
    TemplateSendRequest,
    TemplateStatusResponse,
)
from app.database import get_db
from app.core.security import verify_workspace_access
from app.routers.auth import CurrentUser, get_current_user
from app.services.template_service import TemplateService

router = APIRouter()

# CREATE TEMPLATE
@router.post("/api/templates/create", response_model=TemplateStatusResponse)
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, data.workspace_id)
    template = TemplateService.create_template(
        db,
        workspace_id=workspace_id,
        name=data.name,
        type_=data.type,
        message=data.message,
        category=data.category,
        language=data.language,
    )
    return {
        "status": "created",
        "template": TemplateService.serialize_template(template),
    }


# GET TEMPLATES
@router.get("/api/templates", response_model=TemplateListResponse)
def get_templates(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    templates = TemplateService.get_templates(db, workspace_id)
    return {"templates": [TemplateService.serialize_template(item) for item in templates]}


@router.post("/api/templates/submit/{template_id}", response_model=TemplateStatusResponse)
def submit_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    template = TemplateService.submit_template(
        db,
        template_id=template_id,
        workspace_id=workspace_id,
    )
    return {
        "status": "submitted",
        "template": TemplateService.serialize_template(template),
    }


@router.get("/api/templates/status/{workspace_id}", response_model=TemplateStatusResponse)
def check_template_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    TemplateService.check_template_status(db, verified_workspace_id)
    return {"status": "updated"}


@router.post("/api/messages/send")
def send_message(
    data: TemplateSendRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    res = TemplateService.send_message(
        db,
        workspace_id=workspace_id,
        phone=data.phone,
        template_name=data.template_name,
    )
    return res


# DELETE TEMPLATE
@router.delete("/api/templates/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    TemplateService.delete_template(db, template_id=template_id, workspace_id=workspace_id)
    return {"status": "deleted"}
