from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.templates import Template
from pydantic import BaseModel

router = APIRouter(prefix="/templates", tags=["admin_templates"])

class SystemTemplateCreate(BaseModel):
    name: str
    type: str
    category: str
    language: str
    content: str
    system_tag: str
    header: str | None = None
    footer: str | None = None
    cta: str | None = None
    cta_btn_title: str | None = None

@router.post("/system")
def create_system_template(
    data: SystemTemplateCreate,
    db: Session = Depends(get_db)
):
    new_template = Template(
        name=data.name,
        type=data.type,
        category=data.category,
        language=data.language,
        content=data.content,
        system_tag=data.system_tag,
        header=data.header,
        footer=data.footer,
        cta=data.cta,
        cta_btn_title=data.cta_btn_title,
        status="approved", # System templates are auto-approved
        workspace_id=None,
        user_id=None
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return {"status": "success", "template": new_template.id}

@router.get("/system")
def get_system_templates(
    db: Session = Depends(get_db)
):
    templates = db.query(Template).filter(Template.system_tag.isnot(None)).order_by(Template.created_at.desc()).all()
    return {"templates": [
        {
            "id": str(t.id),
            "name": t.name,
            "type": t.type,
            "category": t.category,
            "language": t.language,
            "content": t.content,
            "system_tag": t.system_tag,
            "header": t.header,
            "footer": t.footer,
            "cta": t.cta,
            "cta_btn_title": t.cta_btn_title,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in templates
    ]}

@router.delete("/system/{template_id}")
def delete_system_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"status": "deleted"}
