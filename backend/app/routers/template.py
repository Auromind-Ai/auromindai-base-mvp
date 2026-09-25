from fastapi import APIRouter, Depends, HTTPException, Request
import logging
logger = logging.getLogger(__name__)
import requests
from sqlalchemy.orm import Session
from pydantic import BaseModel, ValidationError
import os
import re
from dotenv import load_dotenv
from groq import Groq

from app.services.wcc_service import WCCService
from app.database import get_db
from app.models.templates import Template
from app.models.workspace import Workspace
from app.services.template import submit_to_meta
from app.routers.auth import get_current_user, CurrentUser
from app.core.security import verify_workspace_access,to_uuid
from app.core.exceptions import BillingError, WorkspaceAccessError, AIProviderError
from app.services.storage.service import get_storage
router = APIRouter()

from app.schemas.template import (
    TemplateCreate,
    GenerateRequest,
    TemplateSendRequest,
    TemplateRead,
    TemplateListResponse,
    TemplateStatusResponse,
)



def map_language(lang):
    mapping = {"en_US": "English", "en_GB": "English", "ta": "Tamil", "hi": "Hindi"}
    return mapping.get(lang, "English")

def fix_template_boundaries(text: str) -> str:
    if not text:
        return text
    stripped = text.strip()
    if re.match(r"^[\s.,!?;:]*\{\{\d+\}\}", stripped):
        text = "Hello, " + text
    match = re.search(r"\{\{(\d+)\}\}[\s.,!?;:]*$", text)
    if match:
        text = re.sub(r"\{\{\d+\}\}[\s.,!?;:]*$", f"{{{{{match.group(1)}}}}} shortly.", text)
    return text

def fix_floating_variables(text: str) -> str:
    if not text:
        return text
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\{\{\d+\}\}[\s.,!?;:]*$", stripped):
            var_match = re.search(r"\{\{(\d+)\}\}", stripped)
            var_num = var_match.group(1) if var_match else "1"
            if new_lines:
                new_lines[-1] = new_lines[-1].rstrip() + f" {{{{{var_num}}}}}"
            else:
                new_lines.append(f"Hello, {{{{{var_num}}}}}")
        else:
            new_lines.append(line)
    return "\n".join(new_lines)

def format_template_variables(text: str | None) -> str | None:
    if not text:
        return text
    
    # 1. Normalize single braces `{something}` to `{{something}}`
    text = re.sub(r"(?<!\{)\{([^{}]+)\}(?!\})", r"{{\1}}", text)
    
    # 2. Convert all named placeholders `{{var_name}}` to sequential integers: `{{1}}`, `{{2}}`...
    count = [1]
    formatted = re.sub(r"\{\{[^{}]+\}\}", lambda m: f"{{{{{count.insert(0, count[0]+1) or count[1]}}}}}" , text)
    
    formatted = fix_floating_variables(formatted)
    formatted = fix_template_boundaries(formatted)
    return formatted

@router.post("/templates/generate")
async def generate_template(
    data: GenerateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    if not data.prompt or data.prompt.strip() == "":
        raise HTTPException(400, "Prompt is required")
    
    from app.core.exceptions import BillingError, WorkspaceAccessError
    from app.core.security import verify_workspace_access
    from app.services.ai.execution_service import AIExecutionService, AIFeatureRegistry
    import asyncio

    workspace_id = verify_workspace_access(current_user, db)

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

    try:
        res = await AIExecutionService.execute(
            db=db,
            workspace_id=workspace_id,
            user_id=current_user.id,
            feature_key=AIFeatureRegistry.TEMPLATE,
            prompt=user_prompt,
            system_prompt=system_prompt,
            structured_output=True,
            model="auto",
            description="Generate WhatsApp template variations"
        )

        message = res.get("text", "")
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

    except (BillingError, WorkspaceAccessError) as e:
        raise e
    except HTTPException as e:
        raise e
    except AIProviderError as e:
        raise HTTPException(status_code=getattr(e, "status_code", 503), detail=str(e))
    except Exception as e:
        logger.error(f"Template generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="AI template generation failed. Please try again.")

@router.post(
    "/templates/create",
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": TemplateCreate.model_json_schema()
                },
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string"},
                            "message": {"type": "string"},
                            "category": {"type": "string"},
                            "language": {"type": "string"},
                            "header": {"type": "string"},
                            "footer": {"type": "string"},
                            "cta": {"type": "string"},
                            "cta_btn_title": {"type": "string"},
                            "workspace_id": {"type": "string"},
                            "media": {"type": "string", "format": "binary"}
                        },
                        "required": ["name", "message", "category", "language"]
                    }
                }
            }
        }
    }
)
async def create_template(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    content_type = request.headers.get("content-type", "").lower()

    raw_data = {}
    media_file_bytes = None
    media_file_name = None
    media_file_type = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        for key, value in form.items():
            if key == "media":
                if hasattr(value, "read"):
                    media_file_bytes = await value.read()
                    media_file_name = getattr(value, "filename", "media")
                    media_file_type = getattr(value, "content_type", None)
                continue
            if isinstance(value, str):
                v_str = value.strip()
                if v_str in ("null", "undefined"):
                    raw_data[key] = None
                elif v_str == "" and key in ("header", "footer", "cta", "cta_btn_title", "workspace_id"):
                    raw_data[key] = None
                else:
                    raw_data[key] = value
            else:
                raw_data[key] = value
    else:
        try:
            raw_data = await request.json()
        except Exception:
            raise HTTPException(400, "Invalid JSON payload in request body")
        if not isinstance(raw_data, dict):
            raise HTTPException(422, "Input should be a valid dictionary or object")

    try:
        data = TemplateCreate.model_validate(raw_data)
    except ValidationError as ve:
        errors = []
        for err in ve.errors():
            loc = err.get("loc", ())
            field_name = loc[-1] if loc else "field"
            msg = err.get("msg", "Invalid value").replace("Value error, ", "").replace("Assertion failed, ", "")
            errors.append(f"{field_name}: {msg}")
        raise HTTPException(422, detail=", ".join(errors) if errors else str(ve))

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

    data.category = (data.category or "MARKETING").strip().upper()
    data.type = (data.type or "TEXT").strip().upper()
    validate_category(data)

    workspace_id = verify_workspace_access(current_user, db, data.workspace_id)

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    from app.services.config_service import config_service

    system_token = config_service.get("meta_system_user_token")

    if not workspace.meta_waba_id or not system_token:
        raise HTTPException(
            400,
            "WhatsApp channel is not connected or configured. Please connect your WhatsApp channel in Channel Settings or contact support."
        )

    # Process media for IMAGE / VIDEO templates
    media_handle = None
    if data.type in ("IMAGE", "VIDEO"):
        from app.services.meta_upload import get_or_create_media_handle
        try:
            media_handle = get_or_create_media_handle(
                file_bytes=media_file_bytes,
                file_name=media_file_name,
                file_type=media_file_type,
                media_category=data.type,
                existing_handle=data.header,
                system_token=system_token
            )
        except Exception as upload_err:
            logger.error(f"Failed to prepare media handle for Meta: {upload_err}", exc_info=True)
            raise HTTPException(
                400,
                f"Failed to process {data.type.lower()} media for template: {upload_err}"
            )

    components = build_components(data, media_handle=media_handle)
    meta_payload = {
        "name": data.name,
        "category": data.category,
        "language": data.language,
        "components": components,
    }
    try:
        meta_response = submit_to_meta(meta_payload, workspace)
    except Exception as e:
        logger.error(f"Failed to submit template: {e}")
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Failed to submit template due to a connection timeout. Please check your template list or try again in a moment."
        )

    media_url_to_save = None
    if media_file_bytes and len(media_file_bytes) > 0:
        try:
            import uuid
            import os
            storage = get_storage()
            clean_filename = media_file_name or ("media.png" if data.type == "IMAGE" else "media.mp4")
            file_ext = os.path.splitext(clean_filename)[1] or (".png" if data.type == "IMAGE" else ".mp4")
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            rel_path = f"{workspace_id}/templates/{unique_filename}"
            media_url_to_save = await storage.save_file(rel_path, media_file_bytes, media_file_type or "application/octet-stream")
        except Exception as store_err:
            logger.warning(f"Could not persist template media file to storage: {store_err}")

    if not media_url_to_save and getattr(data, "media_url", None):
        media_url_to_save = data.media_url
    elif not media_url_to_save and data.header and (data.header.startswith("http://") or data.header.startswith("https://")):
        media_url_to_save = data.header

    header_to_save = media_handle if data.type in ("IMAGE", "VIDEO") else data.header

    if meta_response.get("error"):
        error_info = meta_response.get("error", {})
        subcode = error_info.get("error_subcode")
        
        # If the template already exists in Meta's system (subcode 2388024)
        if subcode == 2388024:
            logger.info(f"Template already exists on Meta. Fetching its details to recover template ID.")
            try:
                # Retrieve from Meta
                url = f"https://graph.facebook.com/v19.0/{workspace.meta_waba_id}/message_templates?name={data.name}"
                headers = {
                    "Authorization": f"Bearer {workspace.meta_access_token}"
                }
                import requests
                get_res = requests.get(url, headers=headers, timeout=20)
                if get_res.status_code == 200:
                    templates_list = get_res.json().get("data", [])
                    matched_template = None
                    for t in templates_list:
                        if t.get("name") == data.name and t.get("language") == data.language:
                            matched_template = t
                            break
                    
                    if matched_template:
                        meta_template_id = matched_template.get("id")
                        meta_status = matched_template.get("status", "").lower()
                        new_template = Template(
                            name=data.name,
                            type=data.type,
                            content=data.message,
                            header=header_to_save,
                            media_url=media_url_to_save,
                            footer=data.footer,
                            cta=data.cta,
                            cta_btn_title=data.cta_btn_title,
                            status=meta_status if meta_status in ["approved", "pending", "rejected"] else "pending",
                            workspace_id=workspace_id,
                            category=data.category,
                            language=data.language,
                            user_id=current_user.id,
                            meta_template_id=meta_template_id,
                        )
                        db.add(new_template)
                        db.commit()
                        db.refresh(new_template)
                        logger.info(f"Successfully recovered template from Meta: ID={meta_template_id}, Status={new_template.status}")
                        return {"status": "submitted"}
            except Exception as get_exc:
                logger.error(f"Failed to recover template: {get_exc}")
        
        # Default error handling if not recovered: rollback to prevent dirty database state
        logger.error(f"META ERROR: {meta_response}")
        db.rollback()

        error_msg = error_info.get("message", "Template submission was rejected. Please review your template content.")
        error_user_title = error_info.get("error_user_title")
        error_user_msg = error_info.get("error_user_msg")
        detailed_msg = error_user_msg or error_user_title or error_msg
        raise HTTPException(400, f"Template rejected: {detailed_msg}")
    
    else:
        logger.info(f"META SUCCESS: {meta_response}")
        new_template = Template(
            name=data.name,
            type=data.type,
            content=data.message,
            header=header_to_save,
            media_url=media_url_to_save,
            footer=data.footer,
            cta=data.cta,
            cta_btn_title=data.cta_btn_title,
            status="pending",
            workspace_id=workspace_id,
            category=data.category,
            language=data.language,
            user_id=current_user.id,
            meta_template_id=meta_response.get("id"),
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)

    return {"status": "submitted"}


def build_components(data, media_handle: str | None = None):
    components = []
    data_type = (getattr(data, "type", None) or "TEXT").strip().upper()

    # HEADER (TEXT / IMAGE / VIDEO)
    if data_type == "TEXT":
        if getattr(data, "header", None):
            header_text = str(data.header).strip()[:60]
            header_comp = {"type": "HEADER", "format": "TEXT", "text": header_text}
            header_vars = re.findall(r"\{\{(\d+)\}\}", header_text)
            if header_vars:
                max_h_var = max(map(int, header_vars))
                header_comp["example"] = {
                    "header_text": [f"sample_{i}" for i in range(1, max_h_var + 1)]
                }
            components.append(header_comp)

    elif data_type in ("IMAGE", "VIDEO", "DOCUMENT"):
        handle = media_handle or getattr(data, "header_handle", None)
        if not handle and getattr(data, "header", None) and str(data.header).startswith("4:"):
            handle = str(data.header)

        if handle:
            components.append(
                {
                    "type": "HEADER",
                    "format": data_type,
                    "example": {"header_handle": [str(handle)]},
                }
            )

    # BODY (COMMON)
    body_text = str(getattr(data, "message", None) or "").strip()
    body = {"type": "BODY", "text": body_text}

    # variables example (IMPORTANT: Meta requires 2D array: [["val1", "val2"]])
    vars_in_body = re.findall(r"\{\{(\d+)\}\}", body_text)
    if vars_in_body:
        max_var = max(map(int, vars_in_body))
        body["example"] = {
            "body_text": [[f"sample_{i}" for i in range(1, max_var + 1)]]
        }

    components.append(body)

    # FOOTER (Max 60 characters, no variables allowed)
    if getattr(data, "footer", None):
        footer_text = str(data.footer).strip()[:60]
        if footer_text:
            components.append({"type": "FOOTER", "text": footer_text})

    # CTA BUTTON (Max 25 characters for title, valid URL protocol)
    if getattr(data, "cta", None):
        raw_cta = str(data.cta).strip()
        if raw_cta:
            clean_url = raw_cta if (raw_cta.startswith("http://") or raw_cta.startswith("https://")) else f"https://{raw_cta}"
            btn_text = str(getattr(data, "cta_btn_title", None) or "Open").strip()[:25] or "Open"
            btn_obj = {"type": "URL", "text": btn_text, "url": clean_url}
            if "{{1}}" in clean_url:
                btn_obj["example"] = [clean_url.replace("{{1}}", "sample")]
            components.append(
                {
                    "type": "BUTTONS",
                    "buttons": [btn_obj],
                }
            )

    return components


def validate_category(data):
    cat = (getattr(data, "category", None) or "").strip().upper()
    if cat not in ("MARKETING", "UTILITY", "AUTHENTICATION"):
        raise HTTPException(
            400,
            f"Invalid category '{data.category}'. Allowed categories are MARKETING, UTILITY, and AUTHENTICATION."
        )
    if cat == "AUTHENTICATION":
        if "{{1}}" not in (getattr(data, "message", None) or ""):
            raise HTTPException(
                400, "Authentication templates must include OTP variable {{1}}"
            )
    if cat == "MARKETING":
        msg = (getattr(data, "message", None) or "").upper()
        if "OTP" in msg and "{{1}}" in (getattr(data, "message", None) or "") and len(msg) < 60:
            raise HTTPException(
                400, "Authentication OTP messages should use the AUTHENTICATION category, not MARKETING."
            )


# GET SYSTEM TEMPLATES
@router.get("/templates/system")
def get_system_templates(db: Session = Depends(get_db)):
    templates = db.query(Template).filter(Template.system_tag.isnot(None)).all()
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
                "tag": t.system_tag, # Expose as 'tag' for frontend compatibility
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ]
    }

# GET TEMPLATES
@router.get("/templates")
def get_templates(
    workspace_id: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
  
    user_ws = getattr(current_user, "workspace_id", None)
    target_ws = workspace_id or user_ws

    query = db.query(Template)
    if target_ws:
        try:
            ws_uuid = to_uuid(target_ws)
            query = query.filter(
                (Template.workspace_id == ws_uuid) |
                (Template.user_id == current_user.id) |
                (Template.system_tag.isnot(None))
            )
        except Exception:
            query = query.filter(
                (Template.user_id == current_user.id) |
                (Template.system_tag.isnot(None))
            )
    else:
        query = query.filter(
            (Template.user_id == current_user.id) |
            (Template.system_tag.isnot(None))
        )

    if category and category.lower() != "all":
        query = query.filter(Template.category.ilike(category))

    templates = query.order_by(Template.created_at.desc()).all()

    formatted = []
    for t in templates:
        body_text = t.content or ""
        vars_found = list(dict.fromkeys(re.findall(r"\{\{[^}]+\}\}", body_text)))
        formatted.append({
            "id": str(t.id),
            "name": t.name,
            "type": t.type or "TEXT",
            "content": body_text,
            "body": body_text,
            "header": t.header,
            "media_url": getattr(t, "media_url", None) or (t.header if t.header and (t.header.startswith("http://") or t.header.startswith("https://")) else None),
            "footer": t.footer,
            "cta": t.cta,
            "cta_btn_title": t.cta_btn_title,
            "status": (t.status or "draft").lower(),
            "category": (t.category or "MARKETING").upper(),
            "language": t.language or "en_US",
            "variables": vars_found,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "templates": formatted,
        "items": formatted,
        "total": len(formatted),
    }


@router.get("/templates/status/{workspace_id}")
def check_template_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.services.config_service import config_service
    
    system_token = config_service.get("meta_system_user_token")

    if not workspace_id or workspace_id == "null":
        return {"status": "skipped", "message": "No workspace ID provided"}
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {"status": "skipped", "message": "Workspace not found"}

    if not workspace.meta_waba_id or not system_token:
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
    headers = {"Authorization": f"Bearer {system_token}"}
    res = requests.get(url, headers=headers, timeout=10)
    meta_templates = res.json().get("data", [])

    for t in templates:
        for mt in meta_templates:
            if mt["name"] == t.name and mt.get("language") == t.language:
                t.status = mt["status"].lower()

    db.commit()
    return {"status": "updated"}


@router.post("/messages/send")
def send_message(
    data: TemplateSendRequest, 
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, data.workspace_id)
  

    ws_uuid = to_uuid(workspace_id)
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    wallet = WCCService.get_balance(db, ws_uuid)
    if wallet and float(wallet.balance or 0.0) <= 0:
        raise HTTPException(
            status_code=402,
            detail="Insufficient WCC wallet balance to send WhatsApp template message. Please recharge your wallet."
        )


    if not workspace.meta_phone_number_id:
        raise HTTPException(400, "WhatsApp phone number is not configured for this workspace. Please configure it in Channel Settings.")
        
    url = f"https://graph.facebook.com/v19.0/{workspace.meta_phone_number_id}/messages"


    # Query template language from database
    ws_uuid = to_uuid(workspace_id)
    template = db.query(Template).filter(
        Template.name == data.template_name,
        (Template.workspace_id == ws_uuid) | (Template.user_id == current_user.id)
    ).first()
    if not template:
        template = db.query(Template).filter(Template.name == data.template_name).first()
    lang_code = template.language if template else "en_US"

    components = []

    # 1. Header component for IMAGE / VIDEO / DOCUMENT or text variables
    if template:
        tmpl_type = (template.type or "TEXT").upper()
        if tmpl_type in ("IMAGE", "VIDEO", "DOCUMENT"):
            media_type = tmpl_type.lower()
            media_url = (
                getattr(data, "media_url", None)
                or getattr(template, "media_url", None)
                or (template.header if template.header and (template.header.startswith("http://") or template.header.startswith("https://")) else None)
            )
            if not media_url:
                if tmpl_type == "IMAGE":
                    media_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
                elif tmpl_type == "VIDEO":
                    media_url = "https://www.w3schools.com/html/mov_bbb.mp4"
                elif tmpl_type == "DOCUMENT":
                    media_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
            
            if media_url:
                components.append({
                    "type": "header",
                    "parameters": [{
                        "type": media_type,
                        media_type: {"link": media_url}
                    }]
                })
        elif template.header and not template.header.startswith("4:"):
            header_vars = re.findall(r"\{\{(\d+)\}\}", template.header)
            if header_vars:
                components.append({
                    "type": "header",
                    "parameters": [{"type": "text", "text": "Customer"} for _ in header_vars]
                })

    # 2. Body parameters
    variables = data.variables or []
    if variables:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(v)} for v in variables],
        })

    payload = {
        "messaging_product": "whatsapp",
        "to": data.phone,
        "type": "template",
        "template": {
            "name": data.template_name,
            "language": {"code": lang_code},
            "components": components,
        },
    }


    from app.services.config_service import config_service

    system_token = config_service.get("meta_system_user_token")

    if not system_token:
        raise HTTPException(
            503,
            "WhatsApp messaging service is temporarily unavailable. Please try again later."
        )

    headers = {
        "Authorization": f"Bearer {system_token}",
        "Content-Type": "application/json",
    }
    
    res = requests.post(url, json=payload, headers=headers, timeout=10)
    if res.status_code >= 400:
        err_data = {}
        try:
            err_data = res.json()
        except Exception:
            pass
        err_msg = err_data.get("error", {}).get("message") or res.text
        logger.error(f"[Template Send FAILED] {res.status_code}: {err_data}")
        raise HTTPException(status_code=res.status_code, detail=f"Meta error: {err_msg}")
    return res.json()


@router.post("/templates/submit/{template_id}")
def submit_template(
    template_id: str, 
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")

    verify_workspace_access(current_user, db, template.workspace_id)

    workspace = db.query(Workspace).filter(Workspace.id == template.workspace_id).first()
    if not workspace:
        raise HTTPException(404, "Workspace not found")

    from app.services.config_service import config_service

    system_token = config_service.get("meta_system_user_token")

    if not workspace.meta_waba_id or not system_token:
        raise HTTPException(
            400,
            "WhatsApp channel is not connected or configured. Please connect your WhatsApp channel in Channel Settings or contact support."
        )

    # Auto-correct variables format
    template.content = format_template_variables(template.content)
    template.category = (template.category or "MARKETING").strip().upper()
    template.type = (template.type or "TEXT").strip().upper()
    db.commit()

    media_handle = None
    if template.type in ("IMAGE", "VIDEO"):
        from app.services.meta_upload import get_or_create_media_handle
        try:
            media_handle = get_or_create_media_handle(
                media_category=template.type,
                existing_handle=template.header,
                system_token=system_token
            )
            template.header = media_handle
            db.commit()
        except Exception as upload_err:
            logger.error(f"Failed to prepare media handle on submit: {upload_err}")
            raise HTTPException(
                400,
                f"Failed to process {template.type.lower()} media for template: {upload_err}"
            )

    class TempData:
        def __init__(self, t):
            self.type = t.type
            self.header = t.header
            self.message = t.content
            self.footer = t.footer
            self.cta = t.cta
            self.cta_btn_title = t.cta_btn_title

    components = build_components(TempData(template), media_handle=media_handle)

    meta_payload = {
        "name": template.name,
        "category": template.category,
        "language": template.language,
        "components": components,
    }

    try:
        meta_response = submit_to_meta(meta_payload, workspace)
    except Exception as e:
        logger.error(f"Failed to submit template: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to submit template due to a connection timeout. Please check your template list or try again in a moment."
        )

    if meta_response.get("error"):
        logger.error(f"META SUBMIT ERROR: {meta_response}")
        template.status = "rejected"
        db.commit()
        error_info = meta_response.get("error", {})
        error_msg = error_info.get("message", "Template submission was rejected. Please review your template content.")
        error_user_title = error_info.get("error_user_title")
        error_user_msg = error_info.get("error_user_msg")
        detailed_msg = error_user_msg or error_user_title or error_msg
        raise HTTPException(400, f"Template rejected: {detailed_msg}")
    
    else:
        logger.info(f"META SUBMIT SUCCESS: {meta_response}")
        template.meta_template_id = meta_response.get("id")
        template.status = "pending"

    db.commit()
    return {"status": "submitted"}


@router.post("/templates/{template_id}/media")
@router.put("/templates/{template_id}/media")
async def update_template_media(
    template_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        t_uuid = to_uuid(template_id)
        template = db.query(Template).filter(Template.id == t_uuid).first()
    except Exception:
        template = None

    if not template:
        template = db.query(Template).filter(Template.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.workspace_id:
        verify_workspace_access(current_user, db, str(template.workspace_id))

    content_type = request.headers.get("content-type", "").lower()
    media_url = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        uploaded_file = form.get("file") or form.get("media")
        if uploaded_file and hasattr(uploaded_file, "read"):
            file_bytes = await uploaded_file.read()
            if file_bytes and len(file_bytes) > 0:
                import uuid, os
                storage = get_storage()
                tmpl_type = (template.type or "IMAGE").upper()
                default_ext = ".png" if tmpl_type == "IMAGE" else ".mp4"
                filename = getattr(uploaded_file, "filename", None) or f"media{default_ext}"
                _, ext = os.path.splitext(filename)
                ext = ext or default_ext
                default_mime = "image/png" if tmpl_type == "IMAGE" else "video/mp4"
                mime = getattr(uploaded_file, "content_type", None) or default_mime
                unique_name = f"{uuid.uuid4()}{ext}"
                ws_folder = str(template.workspace_id) if template.workspace_id else "global"
                rel_path = f"{ws_folder}/templates/{unique_name}"
                media_url = await storage.save_file(rel_path, file_bytes, mime)
        if not media_url:
            raw_url = form.get("media_url")
            if raw_url and isinstance(raw_url, str) and raw_url.strip():
                media_url = raw_url.strip()
    else:
        try:
            body = await request.json()
            if isinstance(body, dict):
                media_url = body.get("media_url")
        except Exception:
            pass

    if not media_url:
        raise HTTPException(status_code=400, detail="No media file or media_url was provided.")

    template.media_url = media_url
    if not template.header or template.header.startswith("4:"):
        template.header = media_url
    db.commit()
    db.refresh(template)

    return {
        "status": "success",
        "media_url": template.media_url,
        "template": {
            "id": str(template.id),
            "name": template.name,
            "type": template.type,
            "media_url": template.media_url,
            "header": template.header,
            "status": template.status,
            "content": template.content,
        }
    }


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: str, 
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    verify_workspace_access(current_user, db, template.workspace_id)

    db.delete(template)
    db.commit()
    return {"status": "deleted"}
