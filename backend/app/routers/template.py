from fastapi import APIRouter, Depends, HTTPException
import logging
logger = logging.getLogger(__name__)
import requests
from sqlalchemy.orm import Session
from app.schemas.template import TemplateCreate, GenerateRequest
from app.database import get_db
from app.models.templates import Template
from app.services.template import submit_to_meta
from app.models.workspace import Workspace
from dotenv import load_dotenv
import os
from groq import Groq
import re
from app.core.security import verify_workspace_access
from app.routers.auth import get_current_user

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)
router = APIRouter()



def map_language(lang):
    mapping = {"en_US": "English", "en_GB": "English", "ta": "Tamil", "hi": "Hindi"}
    return mapping.get(lang, "English")

@router.post("/templates/generate")
def generate_template(data: GenerateRequest):

    if not data.prompt or data.prompt.strip() == "":
        raise HTTPException(400, "Prompt is required")
    

    lang_name = map_language(data.language)
    system_prompt = f"""
    You are a specialized WhatsApp Business Template Generator.

Your responsibility is to generate high-quality WhatsApp Business templates that are natural, professional, business-appropriate, and likely to comply with Meta template review requirements.

INPUT

* Business Goal
* Language
* Tone
* Variables
* Any additional user instructions

TASK

Analyze the user request and determine:

* The communication purpose
* The intended audience
* The appropriate communication style
* The most suitable business messaging format

Generate templates that match the user's intent without relying on predefined categories or fixed template structures.

MESSAGE GENERATION RULES

* Generate content only in the requested language.
* Use native script whenever applicable.
* Preserve all variables exactly as provided.
* Never rename, translate, remove, reorder, or modify variables.
* Use variables naturally within sentences.
* Generate natural human-like business communication.
* Keep messages concise and easy to understand.
* Avoid repetitive wording across variations.
* Ensure each variation uses a different sentence structure and phrasing.
* Adapt wording dynamically based on the user's goal.

TONE ADAPTATION

Determine the most appropriate writing style from the requested tone.

Adapt:

* Vocabulary
* Formality
* Energy level
* Emoji usage
* Sentence structure

based on the tone provided by the user.

Do not use fixed tone templates.

META COMPLIANCE REQUIREMENTS

Generated content should:

* Sound authentic and trustworthy
* Avoid spam-like language
* Avoid pressure tactics
* Avoid misleading statements
* Avoid exaggerated claims
* Avoid unrealistic promises
* Avoid manipulative urgency
* Avoid excessive capitalization
* Avoid excessive punctuation

If the user's request lacks sufficient business details:

* Generate neutral, reusable business-safe templates.
* Do not invent offers, discounts, prices, promotions, deadlines, links, rewards, or claims.

QUALITY REQUIREMENTS

Every template must:

* Be business appropriate
* Be readable
* Be grammatically correct
* Be suitable for WhatsApp delivery
* Preserve user intent
* Remain professional and customer-friendly

OUTPUT REQUIREMENTS

Return ONLY valid JSON.

{{
  "templates": [
    {{
      "text": "..."
    }},
    {{
      "text": "..."
    }},
    {{
      "text": "..."
    }}
  ]
}}

VALIDATION BEFORE RETURNING

* Ensure valid JSON.
* Ensure exactly 3 templates.
* Ensure all templates are unique.
* Ensure requested language is used.
* Ensure variables are preserved exactly.
* Ensure content aligns with the user's intent.
* Ensure content is business appropriate.
* Ensure content is likely to comply with Meta review requirements.

Return JSON only.

    """
    user_prompt = f"""
    Business Goal: {data.prompt}
    Language: {lang_name}
    Tone: {data.tone}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        message = response.choices[0].message.content
        return {"message": message}
    except Exception as e:
        logger.exception("Template generation failed: %s", e)
        from app.core.exceptions import AIProviderError, get_ai_provider_error_details
        safe_msg, status_code = get_ai_provider_error_details(e, operation="template")
        raise AIProviderError(safe_msg, status_code=status_code)

# CREATE TEMPLATE
@router.post("/templates/create")
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, data.workspace_id)
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    if not workspace.meta_waba_id or not workspace.meta_access_token:
        raise HTTPException(
            400,
            "Meta WhatsApp Business API credentials (WABA ID or Access Token) are not configured for this workspace. Please update them in Settings.",
        )

    new_template = Template(
        name=data.name,
        type=data.type,
        content=data.message,
        status="pending",
        workspace_id=workspace_id,
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    # PASS WORKSPACE
    validate_category(data)
    components = build_components(data)
    meta_payload = {
        "name": data.name,
        "category": data.category,
        "language": data.language,
        "components": components,
    }
    meta_response = submit_to_meta(meta_payload, workspace)
    if meta_response.get("error"):
        print("META ERROR:", meta_response)
        new_template.status = "rejected"
        db.commit()

        error_msg = meta_response.get("error", {}).get(
            "message", "Unknown error from Meta"
        )
        raise HTTPException(400, f"Template rejected by Meta: {error_msg}")
    
    else:
        print("META SUCCESS:", meta_response)
        new_template.meta_template_id = meta_response.get("id")
        new_template.status = "pending"

    db.commit()
    return {"status": "submitted"}


def build_components(data):

    components = []
    # HEADER (TEXT / IMAGE / VIDEO)
    if data.type == "TEXT":
        if data.header:
            components.append({"type": "HEADER", "format": "TEXT", "text": data.header})

    elif data.type == "IMAGE":
        components.append(
            {
                "type": "HEADER",
                "format": "IMAGE",
                "example": {"header_handle": ["https://via.placeholder.com/300"]},
            }
        )

    elif data.type == "VIDEO":

        components.append(
            {
                "type": "HEADER",
                "format": "VIDEO",
                "example": {
                    "header_handle": [
                        "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"
                    ]
                },
            }
        )

    # BODY (COMMON)
    body = {"type": "BODY", "text": data.message}

    # variables example (IMPORTANT)
    vars_in_body = re.findall(r"\{\{(\d+)\}\}", data.message)
    if vars_in_body:

        max_var = max(map(int, vars_in_body))

        body["example"] = {
            "body_text": [[f"sample_{i}" for i in range(1, max_var + 1)]]
        }

    components.append(body)

    # FOOTER
    if data.footer:
        components.append({"type": "FOOTER", "text": data.footer})

    # CTA BUTTON
    if data.cta:

        components.append(
            {
                "type": "BUTTONS",
                "buttons": [{"type": "URL", "text": "Open", "url": data.cta}],
            }
        )

    return components


def validate_category(data):
    if data.category == "AUTHENTICATION":
        if "{{1}}" not in data.message:

            raise HTTPException(
                400, "Authentication templates must include OTP variable {{1}}"
            )
    if data.category == "MARKETING":
        if "OTP" in data.message:
            raise HTTPException(400, "OTP not allowed in marketing templates")


# GET TEMPLATES
@router.get("/templates")
def get_templates(db: Session = Depends(get_db)):

    templates = db.query(Template).order_by(Template.created_at.desc()).all()

    return {
        "templates": [
            {
                "id": str(t.id),
                "name": t.name,
                "type": t.type,
                "content": t.content,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ]
    }


@router.get("/templates/status/{workspace_id}")
def check_template_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    target_workspace_id = None if (not workspace_id or workspace_id == "null") else workspace_id
    workspace_id = verify_workspace_access(current_user, db, target_workspace_id)
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {"status": "skipped", "message": "Workspace not found"}

    if not workspace.meta_waba_id or not workspace.meta_access_token:
        return {"status": "skipped", "message": "Workspace missing Meta credentials"}

    templates = db.query(Template).filter(Template.workspace_id == workspace_id).all()
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


@router.post("/messages/send")
def send_message(data: dict, db: Session = Depends(get_db)):

    workspace = db.query(Workspace).filter(Workspace.id == data["workspace_id"]).first()
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_phone_number_id}/messages"

    components = []
    variables = data.get("variables", [])
    if variables:
        components = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": str(v)} for v in variables],
            }
        ]

    payload = {
        "messaging_product": "whatsapp",
        "to": data["phone"],
        "type": "template",
        "template": {
            "name": data["template_name"],
            "language": {"code": "en"},
            "components": components,
        },
    }

    headers = {
        "Authorization": f"Bearer {workspace.meta_access_token}",
        "Content-Type": "application/json",
    }

    res = requests.post(url, json=payload, headers=headers)
    return res.json()


# DELETE TEMPLATE
@router.delete("/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"status": "deleted"}
