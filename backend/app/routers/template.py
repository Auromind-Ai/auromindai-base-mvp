from fastapi import APIRouter, Depends, HTTPException
import requests
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.templates import Template
from app.services.template import submit_to_meta
from app.models.workspace import Workspace
from dotenv import load_dotenv
import os
from groq import Groq
import re

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


class GenerateRequest(BaseModel):
    prompt: str
    tone: str
    language: str

def map_language(lang):
    mapping = {"en_US": "English", "en_GB": "English", "ta": "Tamil", "hi": "Hindi"}
    return mapping.get(lang, "English")

@router.post("/templates/generate")
def generate_template(data: GenerateRequest):

    if not data.prompt or data.prompt.strip() == "":
        raise HTTPException(400, "Prompt is required")
    
    # system_prompt = f"""
    # You are an expert WhatsApp Business template generator.
    # Your task is to generate 3 different high-quality WhatsApp message templates.
    # STRICT RULES:
    # 1. VARIABLES:
    # - Use ONLY {{{{1}}}}, {{{{2}}}}, {{{{3}}}} format
    # - Sequential order only
    # - Never use names like John or {{name}}
    # 2. OUTPUT:
    # Return EXACTLY 3 variations.
    # 3. STYLE:
    # Each variation must be different in tone:
    # - Variation 1: {data.tone}
    # - Variation 2: slightly different wording
    # - Variation 3: more engaging/creative
    # 4. CONTENT RULES:
    # - Max 3–5 lines
    # - No spam words (FREE!!!, BUY NOW)
    # - Professional but engaging
    # - Emojis allowed (not too many)
    # 5. FORMAT:
    # Return ONLY JSON like this:
    # {{
    # "templates": [
    #     {{
    #     "text": "message 1"
    #     }},
    #     {{
    #     "text": "message 2"
    #     }},
    #     {{
    #     "text": "message 3"
    #     }}
    # ]
    # }}
    # No extra text. No explanation.
    # """

    lang_name = map_language(data.language)
    system_prompt = f"""
    You are a professional WhatsApp Business template generator.

    🎯 GOAL:
    Generate high-quality, Meta-approved WhatsApp message templates that are engaging, natural, and ready for approval.

    --------------------------------------------------
    🌐 LANGUAGE RULES (CRITICAL)
    --------------------------------------------------

    - Generate the message STRICTLY in {lang_name}
    - Use ONLY native script (Example: Tamil எழுத்து, NOT Tanglish)
    - Do NOT mix English words inside the message (except numbers if needed)
    - Keep variables like {{{{1}}}}, {{{{2}}}}, {{{{3}}}} EXACTLY as it is
    - DO NOT translate or modify variables

    --------------------------------------------------
    📦 TEMPLATE RULES
    --------------------------------------------------

    - Generate EXACTLY 3 variations
    - Each template must be:
    - Clear
    - Natural
    - Human-like (not robotic)
    - Max 2–4 lines per template
    - Proper sentence structure (like real business message)
    - Make each template DIFFERENT in wording and structure
    - Do NOT repeat same sentence pattern
    - Ensure visible variation between all 3 templates

    --------------------------------------------------
    🚫 META POLICY RULES (VERY IMPORTANT)
    --------------------------------------------------

    - No spam words (FREE!!!, BUY NOW, CLICK NOW)
    - No misleading or exaggerated claims
    - No abusive or unsafe content
    - Keep message professional and approval-safe
    - Avoid excessive punctuation (!!!, ???)

    --------------------------------------------------
    🎭 STYLE RULES (STRICT)
    --------------------------------------------------

    Generate templates based on tone:
    1. If tone = "normal":
    → simple, clean, professional tone
    → NO emojis

    2. If tone = "exciting":
    → energetic, engaging, slightly emotional
    → MUST include at least 1 emoji (🔥✨🎉💥)
    → emoji should appear at start OR end of sentence
    → max 2 emojis per template

    3. If tone = "funny":
    → light humor, friendly, casual
    → MUST include at least 1 emoji (😂😄😜)
    → humor should feel natural, not forced
    → max 2 emojis per template

    IMPORTANT:
    - Emoji usage is MANDATORY for "exciting" and "funny"
    - DO NOT skip emojis
    - DO NOT overuse emojis
    - ALL 3 templates must follow the selected tone

    --------------------------------------------------
    ⚠️ STRICT OUTPUT RULES (CRITICAL)
    --------------------------------------------------

    - Return ONLY valid JSON
    - DO NOT add explanation
    - DO NOT add headings like "Here are templates"
    - DO NOT use markdown (no ```json)
    - Output must start with {{ and end with }}
    - If output is not valid JSON, regenerate internally
    --------------------------------------------------
    📤 OUTPUT FORMAT (STRICT)
    --------------------------------------------------
    {{
    "templates": [
        {{
        "text": "Template 1"
        }},
        {{

        "text": "Template 2"
        }},
        {{
        "text": "Template 3"
        }}
    ]
    }}
    """
    user_prompt = f"""

        Create a WhatsApp template for:
        "{data.prompt}"
        Language: {lang_name}
        Tone: {data.tone}
        Make it natural and conversational.
        """

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )
    message = response.choices[0].message.content
    return {"message": message}

# CREATE TEMPLATE
@router.post("/templates/create")
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):

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
        status="pending",
        workspace_id=data.workspace_id,
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
def check_template_status(workspace_id: str, db: Session = Depends(get_db)):

    if not workspace_id or workspace_id == "null":
        return {"status": "skipped", "message": "No workspace ID provided"}
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
