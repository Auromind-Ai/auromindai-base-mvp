# from __future__ import annotations
# from uuid import UUID
# import requests
# from fastapi import HTTPException
# from sqlalchemy.orm import Session
# from app.models.templates import Template
# from app.models.workspace import Workspace
# from app.services.template import submit_to_meta


# class TemplateService:
#     @staticmethod
#     def _get_workspace_or_404(db: Session, workspace_id: str | UUID) -> Workspace:
#         workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
#         if not workspace:
#             raise HTTPException(status_code=404, detail="Workspace not found")
#         return workspace

#     @staticmethod
#     def _get_template_or_404(
#         db: Session,
#         template_id: str | UUID,
#         workspace_id: str | UUID,
#     ) -> Template:
#         template = (
#             db.query(Template)
#             .filter(
#                 Template.id == template_id,
#                 Template.workspace_id == workspace_id,
#             )
#             .first()
#         )
#         if not template:
#             raise HTTPException(status_code=404, detail="Template not found")
#         return template

#     @staticmethod
#     def serialize_template(template: Template) -> dict:
#         return {
#             "id": str(template.id),
#             "workspace_id": str(template.workspace_id) if template.workspace_id else None,
#             "name": template.name,
#             "type": template.type,
#             "category": template.category,
#             "language": template.language,
#             "content": template.content,
#             "status": template.status,
#             "meta_template_id": template.meta_template_id,
#             "created_at": template.created_at.isoformat() if template.created_at else None,
#             "updated_at": template.updated_at.isoformat() if template.updated_at else None,
#         }

#     @staticmethod
#     def create_template(
#         db: Session,
#         *,
#         workspace_id: str,
#         name: str,
#         type_: str,
#         message: str,
#         category: str = "MARKETING",
#         language: str = "en",
#     ) -> Template:
#         TemplateService._get_workspace_or_404(db, workspace_id)

#         new_template = Template(
#             name=name,
#             type=type_,
#             category=category,
#             language=language,
#             content=message,
#             status="draft",
#             workspace_id=workspace_id,
#         )

#         db.add(new_template)
#         db.commit()
#         db.refresh(new_template)
#         return new_template

#     @staticmethod
#     def get_templates(db: Session, workspace_id: str):
#         return (
#             db.query(Template)
#             .filter(Template.workspace_id == workspace_id)
#             .order_by(Template.created_at.desc())
#             .all()
#         )

#     @staticmethod
#     def submit_template(
#         db: Session,
#         *,
#         template_id: str,
#         workspace_id: str,
#     ) -> Template:
#         template = TemplateService._get_template_or_404(db, template_id, workspace_id)
#         workspace = TemplateService._get_workspace_or_404(db, workspace_id)

#         meta_response = submit_to_meta(template, workspace)
#         if "id" in meta_response:
#             template.meta_template_id = meta_response["id"]
#             template.status = "pending"
#         else:
#             template.status = "rejected"

#         db.commit()
#         db.refresh(template)
#         return template

#     @staticmethod
#     def check_template_status(db: Session, workspace_id: str):
#         workspace = TemplateService._get_workspace_or_404(db, workspace_id)
#         templates = db.query(Template).filter(Template.workspace_id == workspace_id).all()

#         url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates"
#         headers = {"Authorization": f"Bearer {workspace.meta_access_token}"}

#         response = requests.get(url, headers=headers, timeout=30)
#         meta_templates = response.json().get("data", [])

#         for template in templates:
#             for meta_template in meta_templates:
#                 if meta_template["name"] == template.name:
#                     template.status = meta_template["status"].lower()

#         db.commit()
#         return templates

#     @staticmethod
#     def send_message(
#         db: Session,
#         *,
#         workspace_id: str,
#         phone: str,
#         template_name: str,
#     ):
#         workspace = TemplateService._get_workspace_or_404(db, workspace_id)

#         url = f"https://graph.facebook.com/v19.0/{workspace.meta_phone_number_id}/messages"
#         payload = {
#             "messaging_product": "whatsapp",
#             "to": phone,
#             "type": "template",
#             "template": {
#                 "name": template_name,
#                 "language": {"code": "en"},
#             },
#         }
#         headers = {
#             "Authorization": f"Bearer {workspace.meta_access_token}",
#             "Content-Type": "application/json",
#         }

#         response = requests.post(url, json=payload, headers=headers, timeout=30)
#         return response.json()

#     @staticmethod
#     def delete_template(db: Session, *, template_id: str, workspace_id: str):
#         template = TemplateService._get_template_or_404(db, template_id, workspace_id)
#         db.delete(template)
#         db.commit()
#         return True
