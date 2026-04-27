from fastapi import APIRouter, Depends, HTTPException
import requests
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.templates import Template
from app.services.template import submit_to_meta
from app.models.workspace import Workspace

router = APIRouter()


class TemplateCreate(BaseModel):
    name: str
    type: str
    message: str
    workspace_id: str


# CREATE TEMPLATE
@router.post("/api/templates/create")
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    new_template = Template(
        name=data.name,
        type=data.type,
        content=data.message,
        status="pending",
        workspace_id=data.workspace_id
    )

    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    # PASS WORKSPACE
    meta_response = submit_to_meta(new_template, workspace)

    if "id" in meta_response:
        new_template.meta_template_id = meta_response["id"]
        new_template.status = "pending"
    else:
        new_template.status = "rejected"

    db.commit()

    return {"status": "submitted"}


# GET TEMPLATES
@router.get("/api/templates")
def get_templates(db: Session = Depends(get_db)):

    templates = db.query(Template)\
        .order_by(Template.created_at.desc())\
        .all()

    return {
        "templates": [
            {
                "id": str(t.id),
                "name": t.name,
                "type": t.type,
                "content": t.content,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in templates
        ]
    }

@router.get("/api/templates/status/{workspace_id}")
def check_template_status(workspace_id: str, db: Session = Depends(get_db)):

    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id
    ).first()

    templates = db.query(Template).filter(
        Template.workspace_id == workspace_id
    ).all()

    url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates"
    headers = {"Authorization": f"Bearer {workspace.meta_access_token}"}

    res = requests.get(url, headers=headers)
    meta_templates = res.json().get("data", [])

    for t in templates:
        for mt in meta_templates:
            if mt["name"] == t.name:
                t.status = mt["status"].lower()

    db.commit()

    return {"status": "updated"}


@router.post("/api/messages/send")
def send_message(data: dict, db: Session = Depends(get_db)):

    workspace = db.query(Workspace).filter(
        Workspace.id == data["workspace_id"]
    ).first()

    url = f"https://graph.facebook.com/v19.0/{workspace.meta_phone_number_id}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "to": data["phone"],
        "type": "template",
        "template": {
            "name": data["template_name"],
            "language": {"code": "en"}
        }
    }

    headers = {
        "Authorization": f"Bearer {workspace.meta_access_token}",
        "Content-Type": "application/json"
    }

    res = requests.post(url, json=payload, headers=headers)

    return res.json()


# DELETE TEMPLATE
@router.delete("/api/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):

    template = db.query(Template).filter(Template.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()

    return {"status": "deleted"}