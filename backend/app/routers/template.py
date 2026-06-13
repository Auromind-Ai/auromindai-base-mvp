from fastapi import APIRouter, Depends, HTTPException
import requests
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import re
from dotenv import load_dotenv
from groq import Groq

from app.database import get_db
from app.models.templates import Template
from app.models.workspace import Workspace
from app.services.template import submit_to_meta
from app.routers.auth import get_current_user

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)
router = APIRouter()

class TemplateCreate(BaseModel):
    name: str
    type: str
    message: str
    workspace_id: str
    category: str
    language: str
    header: str | None = None
    footer: str | None = None
    cta: str | None = None
    cta_btn_title: str | None = None


class GenerateRequest(BaseModel):
    prompt: str
    tone: str
    language: str

def map_language(lang):
    mapping = {"en_US": "English", "en_GB": "English", "ta": "Tamil", "hi": "Hindi"}
    return mapping.get(lang, "English")

def fix_template_boundaries(text: str) -> str:
    if not text:
        return text
    stripped = text.strip()
    if re.match(r"^\{\{\d+\}\}", stripped):
        text = "Hello, " + text
    if re.search(r"\{\{\d+\}\}\s*$", text):
        text = text.rstrip() + ". Thank you!"
    return text

def fix_floating_variables(text: str) -> str:
    if not text:
        return text
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\{\{\d+\}\}$", stripped):
            if new_lines:
                new_lines[-1] = new_lines[-1].rstrip() + " " + stripped
            else:
                new_lines.append("Hello, " + stripped)
        else:
            new_lines.append(line)
    return "\n".join(new_lines)

def format_template_variables(text: str | None) -> str | None:
    if not text:
        return text
    formatted = re.sub(r"(?<!\{)\{(\d+)\}(?!\})", r"{{\1}}", text)
    formatted = fix_floating_variables(formatted)
    formatted = fix_template_boundaries(formatted)
    return formatted

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
* Named variables (e.g. {{order_id}}, {{name}}, {{date}}, {{username}}) are strictly FORBIDDEN by Meta and will cause template rejection.
* All variables MUST be formatted as sequential numeric placeholders starting from {{1}}: e.g., {{1}}, {{2}}, {{3}}, etc.
* Convert any custom/named/placeholders in the user's prompt into sequential numeric placeholders.
* NEVER start the template text with a variable placeholder (e.g., {{1}} must not be the first characters). Always prefix with some greeting or static text.
* NEVER end the template text with a variable placeholder (e.g., {{1}} must not be the last characters). Always follow the last variable with ending punctuation or words.
* NEVER place a variable on a line by itself. It must be surrounded by text or punctuation on the same line.
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
* Emoji usage (IMPORTANT: Emojis like 🎉, 🚚, 🛍️, ✅ must be actively and naturally used for ALL languages, including Tamil, Hindi, and English, especially when the tone is 'Exciting' or 'Funny'. Do not omit emojis for non-English languages.)
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
    import json
    try:
        data_dict = json.loads(message)
        if "templates" in data_dict:
            for tpl in data_dict["templates"]:
                if "text" in tpl:
                    tpl["text"] = format_template_variables(tpl["text"])
        message = json.dumps(data_dict)
    except Exception:
        message = format_template_variables(message)
    return {"message": message}

@router.post("/templates/create")
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not data.name or data.name.strip() == "":
        raise HTTPException(400, "Template name is required")
    if not re.match(r"^[a-z0-9_]+$", data.name):
        raise HTTPException(
            400,
            "Template name can only contain lowercase alphanumeric characters and underscores (e.g., app_verification_code)."
        )
    if not data.message or data.message.strip() == "":
        raise HTTPException(400, "Template message content is required")

    # Auto-correct curly braces in message, header, and footer
    data.message = format_template_variables(data.message)
    if data.header:
        data.header = format_template_variables(data.header)
    if data.footer:
        data.footer = format_template_variables(data.footer)

    workspace = db.query(Workspace).filter(Workspace.id == data.workspace_id).first()
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
        header=data.header,
        footer=data.footer,
        cta=data.cta,
        cta_btn_title=data.cta_btn_title,
        status="pending",
        workspace_id=data.workspace_id,
        category=data.category,
        language=data.language,
        user_id=current_user.id,
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
        btn_text = data.cta_btn_title if (hasattr(data, 'cta_btn_title') and data.cta_btn_title) else "Open"
        components.append(
            {
                "type": "BUTTONS",
                "buttons": [{"type": "URL", "text": btn_text, "url": data.cta}],
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
def get_templates(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    templates = (
        db.query(Template)
        .filter(
            (Template.user_id == current_user.id) |
            ((Template.user_id == None) & (Template.workspace_id == current_user.workspace_id))
        )
        .order_by(Template.created_at.desc())
        .all()
    )

    return {
        "templates": [
            {
                "id": str(t.id),
                "name": t.name,
                "type": t.type,
                "content": t.content,
                "header": t.header,
                "footer": t.footer,
                "cta": t.cta,
                "cta_btn_title": t.cta_btn_title,
                "status": t.status,
                "category": t.category,
                "language": t.language,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ]
    }


@router.get("/templates/status/{workspace_id}")
def check_template_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    if not workspace_id or workspace_id == "null":
        return {"status": "skipped", "message": "No workspace ID provided"}
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {"status": "skipped", "message": "Workspace not found"}

    if not workspace.meta_waba_id or not workspace.meta_access_token:
        return {"status": "skipped", "message": "Workspace missing Meta credentials"}

    templates = (
        db.query(Template)
        .filter(Template.workspace_id == workspace_id)
        .filter(
            (Template.user_id == current_user.id) |
            ((Template.user_id == None) & (Template.workspace_id == current_user.workspace_id))
        )
        .all()
    )
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates"
    headers = {"Authorization": f"Bearer {workspace.meta_access_token}"}
    res = requests.get(url, headers=headers)
    meta_templates = res.json().get("data", [])

    for t in templates:
        for mt in meta_templates:
            if mt["name"] == t.name and mt.get("language") == t.language:
                t.status = mt["status"].lower()

    db.commit()
    return {"status": "updated"}


@router.post("/messages/send")
def send_message(data: dict, db: Session = Depends(get_db)):

    workspace = db.query(Workspace).filter(Workspace.id == data["workspace_id"]).first()
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_phone_number_id}/messages"

    # Query template language from database
    template = db.query(Template).filter(
        Template.name == data["template_name"],
        Template.workspace_id == data["workspace_id"]
    ).first()
    lang_code = template.language if template else "en_US"

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
            "language": {"code": lang_code},
            "components": components,
        },
    }

    headers = {
        "Authorization": f"Bearer {workspace.meta_access_token}",
        "Content-Type": "application/json",
    }

    res = requests.post(url, json=payload, headers=headers)
    return res.json()


@router.post("/templates/submit/{template_id}")
def submit_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")

    workspace = db.query(Workspace).filter(Workspace.id == template.workspace_id).first()
    if not workspace:
        raise HTTPException(404, "Workspace not found")

    if not workspace.meta_waba_id or not workspace.meta_access_token:
        raise HTTPException(
            400,
            "Meta WhatsApp Business API credentials (WABA ID or Access Token) are not configured for this workspace.",
        )

    # Auto-correct variables format
    template.content = format_template_variables(template.content)
    db.commit()

    class TempData:
        def __init__(self, t):
            self.type = t.type
            self.header = t.header
            self.message = t.content
            self.footer = t.footer
            self.cta = t.cta
            self.cta_btn_title = t.cta_btn_title

    components = build_components(TempData(template))

    meta_payload = {
        "name": template.name,
        "category": template.category,
        "language": template.language,
        "components": components,
    }

    meta_response = submit_to_meta(meta_payload, workspace)
    if meta_response.get("error"):
        print("META SUBMIT ERROR:", meta_response)
        template.status = "rejected"
        db.commit()
        error_msg = meta_response.get("error", {}).get(
            "message", "Unknown error from Meta"
        )
        raise HTTPException(400, f"Template rejected by Meta: {error_msg}")
    
    else:
        print("META SUBMIT SUCCESS:", meta_response)
        template.meta_template_id = meta_response.get("id")
        template.status = "pending"

    db.commit()
    return {"status": "submitted"}


# DELETE TEMPLATE
@router.delete("/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"status": "deleted"}
