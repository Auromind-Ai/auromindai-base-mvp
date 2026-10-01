from fastapi import APIRouter, Depends, HTTPException, Request
import logging
logger = logging.getLogger(__name__)
import requests
from sqlalchemy.orm import Session
from pydantic import BaseModel, ValidationError
import os
import re
from decimal import Decimal
from dotenv import load_dotenv
from groq import Groq

from app.services.wcc_service import WCCService, InsufficientWCCBalanceError
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

def map_template_variables(text: str | None, provided_mapping: dict | None = None) -> tuple[str | None, dict[str, str]]:
    """
    Converts named placeholders like {{customer_name}}, {{plan_name}} into sequential
    WhatsApp numeric placeholders: {{1}}, {{2}}...
    Returns (formatted_text, mapping_dict_numbered_to_named)
    e.g. ("Hi {{1}}, Your {{2}} plan...", {"1": "customer_name", "2": "plan_name"})
    """
    if not text:
        return text, {}

    # 1. Normalize single braces `{something}` to `{{something}}`
    text = re.sub(r"(?<!\{)\{([^{}]+)\}(?!\})", r"{{\1}}", text)

    # 2. Extract all placeholders
    raw_placeholders = re.findall(r"\{\{([^{}]+)\}\}", text)
    mapping: dict[str, str] = {} # "1": "customer_name"
    var_to_num: dict[str, str] = {} # "customer_name": "1"

    if provided_mapping and isinstance(provided_mapping, dict):
        for k, v in provided_mapping.items():
            k_clean = str(k).replace("{", "").replace("}", "").strip()
            v_clean = str(v).replace("{", "").replace("}", "").strip()
            if k_clean.isdigit():
                mapping[k_clean] = v_clean
                var_to_num[v_clean] = k_clean
            elif v_clean.isdigit():
                mapping[v_clean] = k_clean
                var_to_num[k_clean] = v_clean

    current_idx = 1
    for p in raw_placeholders:
        clean = p.strip()
        if clean.isdigit():
            num_str = clean
            if num_str not in mapping:
                mapping[num_str] = f"var_{num_str}"
            var_to_num[mapping[num_str]] = num_str
        else:
            if clean not in var_to_num:
                while str(current_idx) in mapping:
                    current_idx += 1
                num_str = str(current_idx)
                var_to_num[clean] = num_str
                mapping[num_str] = clean
                current_idx += 1

    def repl(m):
        raw = m.group(1).strip()
        if raw.isdigit():
            return f"{{{{{raw}}}}}"
        num = var_to_num.get(raw, "1")
        return f"{{{{{num}}}}}"

    formatted = re.sub(r"\{\{([^{}]+)\}\}", repl, text)
    formatted = fix_floating_variables(formatted)
    formatted = fix_template_boundaries(formatted)
    return formatted, mapping

def format_template_variables(text: str | None) -> str | None:
    formatted, _ = map_template_variables(text)
    return formatted

def ensure_meaningful_template_variables(text: str | None, prompt: str = "") -> str | None:
    if not text:
        return text

    # 1. Normalize any single curly braces {var} to double curly braces {{var}}
    text = re.sub(r"(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})", r"{{\1}}", text)

    prompt_lower = (prompt or "").lower()
    is_otp = any(k in prompt_lower for k in ["otp", "verification", "auth", "code", "password"])

    def repl(m):
        raw = m.group(1).strip()
        clean = re.sub(r"[^\w]", "", raw)
        if clean.isdigit():
            num = int(clean or "1")
            if is_otp and num == 1:
                return "{{otp_code}}"
            if num == 1:
                return "{{customer_name}}"
            elif num == 2:
                if any(k in prompt_lower for k in ["order", "cart", "track"]):
                    return "{{order_id}}"
                if any(k in prompt_lower for k in ["appointment", "booking", "schedule"]):
                    return "{{appointment_date}}"
                if any(k in prompt_lower for k in ["b2b", "company", "business"]):
                    return "{{company}}"
                return "{{plan_name}}"
            elif num == 3:
                if any(k in prompt_lower for k in ["amount", "price", "pay", "cost", "bill"]):
                    return "{{amount}}"
                if any(k in prompt_lower for k in ["deal", "discount", "offer"]):
                    return "{{deal_value}}"
                return "{{amount}}"
            elif num == 4:
                return "{{product_name}}"
            else:
                return f"{{custom_field_{num}}}"
        return f"{{{{{raw}}}}}"

    formatted = re.sub(r"\{\{([^{}]+)\}\}", repl, text)
    formatted = fix_floating_variables(formatted)
    formatted = fix_template_boundaries(formatted)
    # Ensure double braces again after boundaries/floating check
    formatted = re.sub(r"(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})", r"{{\1}}", formatted)
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

    workspace_id = verify_workspace_access(current_user, db, data.workspace_id, required_permission='templates.manage')

    lang_name = map_language(data.language)
    system_prompt = """
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
* Variables MUST ALWAYS be enclosed in DOUBLE curly braces {{variable_name}}, NEVER single curly braces {variable_name}.
  Example format: {{customer_name}}, {{company}}, {{product_name}}, {{plan_name}}, {{amount}}, {{order_id}}, {{appointment_date}}, {{otp_code}}
  STRICTLY FORBIDDEN: {customer_name}, {company}, or raw numeric placeholders like {{1}}, {{2}}.
* NEVER start the template text with a variable placeholder (e.g., {{customer_name}} must not be the first characters). Always prefix with some greeting or static text (e.g., "Hi {{customer_name}}, ...").
* NEVER end the template text with a variable placeholder. Always follow the last variable with ending punctuation or words.
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
                        tpl["text"] = ensure_meaningful_template_variables(tpl["text"], data.prompt)
            message = json.dumps(data_dict)
        except Exception:
            message = ensure_meaningful_template_variables(message, data.prompt)
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
                            "body_examples": {"type": "array", "items": {"type": "string"}},
                            "header_examples": {"type": "array", "items": {"type": "string"}},
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
                elif key in ("body_examples", "header_examples"):
                    try:
                        import json
                        raw_data[key] = json.loads(v_str) if v_str.startswith("[") else [x.strip() for x in v_str.split(",") if x.strip()]
                    except Exception:
                        raw_data[key] = [x.strip() for x in v_str.split(",") if x.strip()]
                elif key in ("variable_mapping", "buttons"):
                    try:
                        import json
                        raw_data[key] = json.loads(v_str) if isinstance(v_str, str) and (v_str.startswith("{") or v_str.startswith("[")) else v_str
                    except Exception:
                        raw_data[key] = v_str
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

    # Auto-correct curly braces and map variables in message, header, and footer
    provided_map = data.variable_mapping
    if isinstance(provided_map, str):
        try:
            import json
            provided_map = json.loads(provided_map)
        except Exception:
            provided_map = None

    formatted_msg, auto_mapping = map_template_variables(data.message, provided_map)
    data.message = formatted_msg
    
    # Combined mapping
    combined_mapping = auto_mapping
    if provided_map and isinstance(provided_map, dict):
        combined_mapping.update(provided_map)
    data.variable_mapping = combined_mapping

    if data.header:
        data.header = format_template_variables(data.header)
    if data.footer:
        data.footer = format_template_variables(data.footer)

    data.category = (data.category or "MARKETING").strip().upper()
    data.type = (data.type or "TEXT").strip().upper()
    validate_category(data)

    workspace_id = verify_workspace_access(current_user, db, data.workspace_id, required_permission='templates.manage')

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
                        import json
                        var_mapping_to_save = json.dumps(combined_mapping) if combined_mapping else None
                        buttons_to_save = None
                        if getattr(data, "buttons", None):
                            buttons_to_save = data.buttons if isinstance(data.buttons, str) else json.dumps(data.buttons)
                        new_template = Template(
                            name=data.name,
                            type=data.type,
                            content=data.message,
                            header=header_to_save,
                            media_url=media_url_to_save,
                            footer=data.footer,
                            cta=data.cta,
                            cta_btn_title=data.cta_btn_title,
                            buttons=buttons_to_save,
                            status=meta_status if meta_status in ["approved", "pending", "rejected"] else "pending",
                            workspace_id=workspace_id,
                            category=data.category,
                            language=data.language,
                            user_id=current_user.id,
                            meta_template_id=meta_template_id,
                            variable_mapping=var_mapping_to_save,
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
        import json
        var_mapping_to_save = json.dumps(combined_mapping) if combined_mapping else None
        buttons_to_save = None
        if getattr(data, "buttons", None):
            buttons_to_save = data.buttons if isinstance(data.buttons, str) else json.dumps(data.buttons)
        new_template = Template(
            name=data.name,
            type=data.type,
            content=data.message,
            header=header_to_save,
            media_url=media_url_to_save,
            footer=data.footer,
            cta=data.cta,
            cta_btn_title=data.cta_btn_title,
            buttons=buttons_to_save,
            status="pending",
            workspace_id=workspace_id,
            category=data.category,
            language=data.language,
            user_id=current_user.id,
            meta_template_id=meta_response.get("id"),
            variable_mapping=var_mapping_to_save,
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)

    return {"status": "submitted"}


def infer_realistic_sample(before: str, after: str, index: int) -> str:
    b_clause = re.split(r"[,.!?;\n]|\{\{\d+\}\}", before)[-1].strip()
    a_clause = re.split(r"[,.!?;\n]|\{\{\d+\}\}", after)[0].strip()

    b_words = re.findall(r"\b[a-zA-Z$₹]+\b", b_clause)
    immediate_before = " ".join(b_words[-3:]).lower() if b_words else ""

    a_words = re.findall(r"\b[a-zA-Z$₹]+\b", a_clause)
    immediate_after = " ".join(a_words[:3]).lower() if a_words else ""

    clause_context = f"{immediate_before} {immediate_after}".strip()

    # 1. Organization / Store / Community if 'welcome to'
    if "welcome to" in immediate_before:
        items = ["Acme Store", "Orbion Team", "Our Community", "Prime Services"]
        return items[(index - 1) % len(items)]

    # 2. Greeting / Name
    if any(k in immediate_before for k in ["hello", "hi", "hey", "dear", "mr", "ms", "mrs", "dr", "vanakkam", "namaste", "welcome", "name", "customer", "user", "member", "guest"]):
        names = ["Alex", "Karthik", "John", "Priya", "Rahul"]
        return names[(index - 1) % len(names)]

    # 3. OTP / Verification Code / PIN
    if any(k in clause_context for k in ["otp", "pin", "verification code", "passcode", "security code"]):
        return "592814"

    # 4. Coupon / Promo / Voucher
    if any(k in clause_context for k in ["coupon", "promo", "voucher", "discount code", "code", "deal"]):
        return "SAVE20"

    # 5. Order / Invoice / Booking / Ticket ID
    if any(k in clause_context for k in ["order", "invoice", "booking", "ticket", "awb", "tracking", "consignment", "package", "ref", "reference", "receipt", "bill"]):
        ids = ["ORD-10923", "INV-84920", "TCK-55102", "TRK-99210"]
        return ids[(index - 1) % len(ids)]

    # 6. Currency / Price / Amount
    if any(k in clause_context for k in ["rs", "inr", "usd", "dollar", "$", "₹", "amount", "price", "cost", "total", "fee", "pay", "paid", "due", "balance"]):
        amounts = ["499", "1250", "99", "2500"]
        return amounts[(index - 1) % len(amounts)]

    # 7. Date / Time / Delivery
    if any(k in clause_context for k in ["date", "time", "scheduled", "delivery", "delivered", "arrive", "slot", "tomorrow", "valid till", "expires", "deadline"]):
        dates = ["Monday at 10:00 AM", "Tomorrow at 5:00 PM", "25th October", "3 business days"]
        return dates[(index - 1) % len(dates)]

    # 8. Organization / Store / Team / Brand / Product
    if any(k in clause_context for k in ["store", "shop", "company", "brand", "team", "service", "item", "product", "plan", "course"]):
        items = ["Acme Store", "Orbion Team", "Premium Plan", "Standard Delivery"]
        return items[(index - 1) % len(items)]

    fallbacks = ["John", "ORD-1029", "Rs. 499", "Tomorrow", "Premium Plan", "Confirmed", "Support Team"]
    return fallbacks[(index - 1) % len(fallbacks)]


def generate_smart_variable_examples(
    text: str,
    custom_examples: list[str] | dict | str | None = None,
    variable_mapping: dict | str | None = None,
) -> list[str]:
    if isinstance(custom_examples, (dict, str)) and variable_mapping is None:
        variable_mapping = custom_examples
        custom_examples = None
    if not text:
        return []
    var_matches = list(re.finditer(r"\{\{(\d+)\}\}", text))
    if not var_matches:
        return []
    vars_found = [(int(m.group(1)), m.start(), m.end()) for m in var_matches]
    max_var = max(v[0] for v in vars_found)
    examples = []

    # Parse variable_mapping if string
    v_map = {}
    if variable_mapping:
        if isinstance(variable_mapping, str):
            try:
                import json
                v_map = json.loads(variable_mapping)
            except Exception:
                pass
        elif isinstance(variable_mapping, dict):
            v_map = variable_mapping

    for i in range(1, max_var + 1):
        if custom_examples and len(custom_examples) >= i:
            cand = str(custom_examples[i - 1]).strip()
            if cand and not re.match(r"^sample[_\-\s]?\d*$", cand, re.IGNORECASE):
                examples.append(cand)
                continue

        # Check if variable_mapping has a specific known variable name
        var_name = v_map.get(str(i)) or v_map.get(i)
        if var_name:
            v_lower = str(var_name).lower().strip()
            if any(k in v_lower for k in ["plan_name", "plan"]):
                examples.append("Pro Plan")
                continue
            if any(k in v_lower for k in ["product_name", "product"]):
                examples.append("Orbion Suite")
                continue
            if "last_name" in v_lower:
                examples.append("Doe")
                continue
            if any(k in v_lower for k in ["customer_name", "first_name", "client"]):
                examples.append("John")
                continue
            if v_lower == "name" or ("name" in v_lower and "plan" not in v_lower and "product" not in v_lower):
                examples.append("John")
                continue
            if any(k in v_lower for k in ["amount", "price", "deal_value", "cost"]):
                examples.append("$49.00")
                continue
            if "phone" in v_lower:
                examples.append("+1234567890")
                continue
            if "email" in v_lower:
                examples.append("alex@example.com")
                continue
            if any(k in v_lower for k in ["date", "time", "appointment"]):
                examples.append("Tomorrow at 3:00 PM")
                continue
            if "status" in v_lower:
                examples.append("Qualified")
                continue
            if "company" in v_lower:
                examples.append("Acme Corp")
                continue
            if any(k in v_lower for k in ["otp", "verification", "code", "passcode"]):
                examples.append("492018")
                continue

        match_info = next((v for v in vars_found if v[0] == i), None)
        if match_info:
            _, start, end = match_info
            before = text[:start]
            after = text[end:]
            examples.append(infer_realistic_sample(before, after, i))
        else:
            examples.append(infer_realistic_sample("", "", i))
    return examples


def build_components(data, media_handle: str | None = None):
    components = []
    category = (getattr(data, "category", None) or "MARKETING").strip().upper()
    data_type = (getattr(data, "type", None) or "TEXT").strip().upper()

    # Meta strictly enforces the format for AUTHENTICATION templates:
    # 1. BODY cannot contain "text" field. Only "add_security_recommendation": True/False
    # 2. FOOTER cannot contain "text" field. Only "code_expiration_minutes": int (1-90)
    # 3. BUTTONS must be of type OTP (COPY_CODE or ONE_TAP)
    # 4. No HEADER is permitted
    if category == "AUTHENTICATION":
        auth_body = {
            "type": "BODY",
            "add_security_recommendation": True
        }
        components.append(auth_body)

        # Optional Code Expiration Footer
        exp_mins = 10
        if getattr(data, "footer", None):
            f_str = str(data.footer).strip()
            digits = re.findall(r"\b(\d+)\b", f_str)
            if digits:
                try:
                    val = int(digits[0])
                    if 1 <= val <= 90:
                        exp_mins = val
                except Exception:
                    pass
            components.append({
                "type": "FOOTER",
                "code_expiration_minutes": exp_mins
            })

        # OTP Button (COPY_CODE)
        btn_text = str(getattr(data, "cta_btn_title", None) or "").strip()
        if not btn_text or btn_text.lower() in ["open", "buy now", "click here", "submit"]:
            btn_text = "Copy Code"
        btn_text = btn_text[:25]

        components.append({
            "type": "BUTTONS",
            "buttons": [
                {
                    "type": "OTP",
                    "otp_type": "COPY_CODE",
                    "text": btn_text
                }
            ]
        })

        return components

    # HEADER (TEXT / IMAGE / VIDEO) for MARKETING and UTILITY
    if data_type == "TEXT":
        if getattr(data, "header", None):
            header_text = str(data.header).strip()[:60]
            header_comp = {"type": "HEADER", "format": "TEXT", "text": header_text}
            header_vars = re.findall(r"\{\{(\d+)\}\}", header_text)
            if header_vars:
                h_custom = getattr(data, "header_examples", None)
                h_map = getattr(data, "variable_mapping", None)
                h_examples = generate_smart_variable_examples(header_text, h_custom, h_map)
                header_comp["example"] = {
                    "header_text": h_examples
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

    # BODY (COMMON for MARKETING and UTILITY)
    body_text = str(getattr(data, "message", None) or "").strip()
    body = {"type": "BODY", "text": body_text}

    # variables example (IMPORTANT: Meta requires 2D array: [["val1", "val2"]])
    vars_in_body = re.findall(r"\{\{(\d+)\}\}", body_text)
    if vars_in_body:
        b_custom = getattr(data, "body_examples", None)
        b_map = getattr(data, "variable_mapping", None)
        b_examples = generate_smart_variable_examples(body_text, b_custom, b_map)
        body["example"] = {
            "body_text": [b_examples]
        }

    components.append(body)

    # FOOTER (Max 60 characters, no variables allowed)
    if getattr(data, "footer", None):
        footer_text = str(data.footer).strip()[:60]
        if footer_text:
            components.append({"type": "FOOTER", "text": footer_text})

    # INTERACTIVE BUTTONS (Meta allows up to 10 buttons: QUICK_REPLY, URL, PHONE_NUMBER, COPY_CODE, VOICE_CALL)
    raw_buttons = getattr(data, "buttons", None)
    parsed_buttons = []
    if raw_buttons:
        if isinstance(raw_buttons, str):
            try:
                import json
                parsed_buttons = json.loads(raw_buttons)
            except Exception:
                parsed_buttons = []
        elif isinstance(raw_buttons, list):
            parsed_buttons = raw_buttons

    meta_buttons = []
    if parsed_buttons:
        for b in parsed_buttons:
            if not isinstance(b, dict):
                continue
            b_type = str(b.get("type") or "QUICK_REPLY").strip().upper()
            title = str(b.get("text") or b.get("title") or "").strip()[:25]

            # 1. Custom / Quick Reply
            if b_type in ("QUICK_REPLY", "CUSTOM"):
                if title:
                    meta_buttons.append({
                        "type": "QUICK_REPLY",
                        "text": title
                    })

            # 2. Visit Website / URL
            elif b_type in ("URL", "VISIT_WEBSITE"):
                raw_url = str(b.get("url") or b.get("value") or "").strip()
                if raw_url:
                    clean_url = raw_url if (raw_url.startswith("http://") or raw_url.startswith("https://")) else f"https://{raw_url}"
                    btn_obj = {
                        "type": "URL",
                        "text": title or "Visit Website",
                        "url": clean_url
                    }
                    if "{{" in clean_url:
                        btn_obj["example"] = [re.sub(r"\{\{[^}]+\}\}", "12345", clean_url)]
                    meta_buttons.append(btn_obj)

            # 3. Call Phone Number
            elif b_type in ("PHONE_NUMBER", "CALL_PHONE"):
                raw_phone = str(b.get("phone_number") or b.get("phone") or b.get("value") or "").strip()
                if raw_phone:
                    clean_phone = re.sub(r"[^\d+]", "", raw_phone)
                    if not clean_phone.startswith("+"):
                        clean_phone = f"+{clean_phone}"
                    meta_buttons.append({
                        "type": "PHONE_NUMBER",
                        "text": title or "Call Phone Number",
                        "phone_number": clean_phone
                    })

            # 4. Copy Offer Code
            elif b_type in ("COPY_CODE", "COPY_OFFER_CODE"):
                code_val = str(b.get("example") or b.get("code") or b.get("value") or "SAVE20").strip()[:15]
                meta_buttons.append({
                    "type": "COPY_CODE",
                    "example": code_val or "SAVE20"
                })

            # 5. Call on WhatsApp (Voice Call)
            elif b_type in ("VOICE_CALL", "CALL_ON_WHATSAPP"):
                meta_buttons.append({
                    "type": "VOICE_CALL",
                    "text": title or "Call on WhatsApp"
                })

            # 6. Share Contact Info / Flow fallback
            elif b_type in ("FLOW", "SHARE_CONTACT", "CONTACT_INFO"):
                meta_buttons.append({
                    "type": "QUICK_REPLY",
                    "text": title or "Share Contact Info"
                })

    if meta_buttons:
        components.append({
            "type": "BUTTONS",
            "buttons": meta_buttons[:10]
        })
    elif getattr(data, "cta", None):
        raw_cta = str(data.cta).strip()
        if raw_cta:
            clean_url = raw_cta if (raw_cta.startswith("http://") or raw_cta.startswith("https://")) else f"https://{raw_cta}"
            btn_text = str(getattr(data, "cta_btn_title", None) or "Open").strip()[:25] or "Open"
            btn_obj = {"type": "URL", "text": btn_text, "url": clean_url}
            if "{{1}}" in clean_url:
                btn_obj["example"] = [clean_url.replace("{{1}}", "track1029")]
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
        msg = (getattr(data, "message", None) or "")
        has_var = bool(re.search(r"\{\{[^}]+\}\}", msg))
        if not has_var:
            raise HTTPException(
                400, "Authentication templates must include an OTP variable like {{otp_code}} or {{1}}"
            )
    if cat == "MARKETING":
        msg = (getattr(data, "message", None) or "").upper()
        if "OTP" in msg and "{{1}}" in (getattr(data, "message", None) or "") and len(msg) < 60:
            raise HTTPException(
                400, "Authentication OTP messages should use the AUTHENTICATION category, not MARKETING."
            )


def format_template_dict(t: Template) -> dict:
    body_text = t.content or ""
    vars_found = list(dict.fromkeys(re.findall(r"\{\{[^}]+\}\}", body_text)))

    # Parse variable mapping
    var_map = {}
    if getattr(t, "variable_mapping", None):
        try:
            import json
            var_map = json.loads(t.variable_mapping) if isinstance(t.variable_mapping, str) else (t.variable_mapping or {})
        except Exception:
            var_map = {}

    # Reconstruct named_content if variable_mapping is present
    named_content = body_text
    if var_map:
        for num_key, name_val in var_map.items():
            named_content = re.sub(rf"\{{\{{\s*\[?{re.escape(str(num_key))}\]?\s*\}}\}}", f"{{{{{name_val}}}}}", named_content)
    
    # Fallback for authentication/OTP templates if not mapped
    if (t.category or "").upper() == "AUTHENTICATION" or "otp" in (t.name or "").lower():
        named_content = re.sub(r"\{\{\s*\[?1\]?\s*\}\}", "{{otp_code}}", named_content)
        if "1" not in var_map:
            var_map["1"] = "otp_code"

    # Variables list: return meaningful variable names if mapped, else numbered tags
    resolved_vars = []
    for v in vars_found:
        clean_num = v.replace("{", "").replace("}", "").replace("[", "").replace("]", "").strip()
        if clean_num in var_map:
            resolved_vars.append(var_map[clean_num])
        else:
            resolved_vars.append(clean_num)

    parsed_buttons = []
    if getattr(t, "buttons", None):
        try:
            import json
            parsed_buttons = json.loads(t.buttons) if isinstance(t.buttons, str) else (t.buttons or [])
        except Exception:
            parsed_buttons = []

    return {
        "id": str(t.id),
        "name": t.name,
        "type": t.type or "TEXT",
        "content": body_text,
        "body": body_text,
        "named_content": named_content,
        "variable_mapping": var_map,
        "header": t.header,
        "media_url": getattr(t, "media_url", None) or (t.header if t.header and (t.header.startswith("http://") or t.header.startswith("https://")) else None),
        "footer": t.footer,
        "cta": t.cta,
        "cta_btn_title": t.cta_btn_title,
        "buttons": parsed_buttons,
        "status": (t.status or "draft").lower(),
        "category": (t.category or "MARKETING").upper(),
        "language": t.language or "en_US",
        "variables": resolved_vars if resolved_vars else vars_found,
        "tag": t.system_tag,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


# GET SYSTEM TEMPLATES
@router.get("/templates/system")
def get_system_templates(db: Session = Depends(get_db)):
    templates = db.query(Template).filter(Template.system_tag.isnot(None)).all()
    formatted = [format_template_dict(t) for t in templates]
    return {
        "templates": formatted
    }

# GET TEMPLATES
@router.get("/templates")
def get_templates(
    workspace_id: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
  
    target_ws = verify_workspace_access(current_user, db, workspace_id, required_permission=("templates.manage", "marketing.campaigns", "inbox.conversations", "automation.manage"))
    ws_uuid = to_uuid(target_ws)
    query = db.query(Template).filter(
        (Template.workspace_id == ws_uuid) | Template.system_tag.isnot(None)
    )

    if category and category.lower() != "all":
        query = query.filter(Template.category.ilike(category))

    templates = query.order_by(Template.created_at.desc()).all()
    formatted = [format_template_dict(t) for t in templates]

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
    workspace_id = verify_workspace_access(current_user, db, workspace_id, required_permission=("templates.manage", "inbox.conversations", "marketing.campaigns"))
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
    import json
    from datetime import datetime, timezone
    from decimal import Decimal

    workspace_id = verify_workspace_access(current_user, db, data.workspace_id, required_permission=('templates.manage', 'inbox.conversations', 'marketing.campaigns'))
  
    ws_uuid = to_uuid(workspace_id)
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    if not workspace.meta_phone_number_id:
        raise HTTPException(400, "WhatsApp phone number is not configured for this workspace. Please configure it in Channel Settings.")

    # Query template language & category from database
    template = db.query(Template).filter(
        Template.name == data.template_name,
        (Template.workspace_id == ws_uuid) | (Template.user_id == current_user.id)
    ).first()
    if not template:
        template = db.query(Template).filter(Template.name == data.template_name).first()
    lang_code = template.language if template else "en_US"
    category = (template.category or "marketing").lower() if template else "marketing"

    # Pre-flight WCC wallet balance check
    overage_enabled = getattr(workspace, "overage_enabled", False)
    estimate = WCCService.calculate_estimate(db, ws_uuid, audience_size=1, category=category)
    try:
        WCCService.check_preflight_balance(db, ws_uuid, estimate["estimated_cost"], overage_enabled=overage_enabled)
    except InsufficientWCCBalanceError as e:
        raise HTTPException(status_code=402, detail=str(e))

    url = f"https://graph.facebook.com/v19.0/{workspace.meta_phone_number_id}/messages"

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

    # For AUTHENTICATION templates with COPY_CODE button, Meta also expects the button parameter
    if category == "AUTHENTICATION" and variables:
        components.append({
            "type": "button",
            "sub_type": "url",
            "index": "0",
            "parameters": [
                {
                    "type": "text",
                    "text": str(variables[0])
                }
            ]
        })

    # Clean phone number (Meta Cloud API requires digits only with country code)
    cleaned_phone = re.sub(r"[^\d+]", "", data.phone)
    if cleaned_phone.startswith("+"):
        cleaned_phone = cleaned_phone[1:]
    if len(cleaned_phone) == 10:
        cleaned_phone = f"91{cleaned_phone}"

    payload = {
        "messaging_product": "whatsapp",
        "to": cleaned_phone,
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

    res_data = res.json()
    messages_arr = res_data.get("messages", [])
    wamid = messages_arr[0].get("id") if messages_arr else None

    # Resolve or create Conversation so template appears in chat log
    from app.services.inbox.conversation_service import ConversationService
    from app.models.conversation import Conversation, ChannelType, ConversationStatus
    from app.models.message import Message, MessageStatus, SenderType
    from app.models.ai_action import Lead
    from app.services.crm.lead_scoring_service import recalculate_lead_score

    conv = db.query(Conversation).filter(
        Conversation.workspace_id == ws_uuid,
        (Conversation.phone == cleaned_phone) | (Conversation.phone == f"+{cleaned_phone}") | (Conversation.external_id == cleaned_phone)
    ).first()
    if not conv:
        conv = ConversationService.get_or_create_conversation(
            db=db,
            workspace_id=ws_uuid,
            channel=ChannelType.WHATSAPP,
            phone=cleaned_phone,
            external_id=cleaned_phone,
            contact_name=cleaned_phone,
        )
    if conv and conv.status != ConversationStatus.OPEN:
        conv.status = ConversationStatus.OPEN

    # Interpolate template body variables for display
    formatted_content = template.content if template else f"Template: {data.template_name}"
    if variables:
        for idx, val in enumerate(variables, start=1):
            formatted_content = formatted_content.replace(f"{{{{{idx}}}}}", str(val))

    meta_dict = {
        "template_name": data.template_name,
        "variables": data.variables or [],
        "language": lang_code,
        "template_category": category,
        "is_template": True,
        "source": "template_message"
    }
    if getattr(data, "media_url", None):
        meta_dict["media_url"] = data.media_url
        if template and template.type in ("IMAGE", "VIDEO", "DOCUMENT"):
            meta_dict["message_type"] = template.type.lower()

    # Save Message record in database
    new_msg = Message(
        conversation_id=conv.id,
        content=formatted_content,
        sender_type=SenderType.AGENT,
        status=MessageStatus.SENT,
        external_id=wamid,
        metadata_json=json.dumps(meta_dict),
        source="template_message"
    )
    db.add(new_msg)
    conv.last_message_at = datetime.now(timezone.utc)

    # Link Lead and recalculate activity / score
    lead = db.query(Lead).filter(
        Lead.workspace_id == ws_uuid,
        (Lead.conversation_id == conv.id) | (Lead.phone == cleaned_phone) | (Lead.phone == f"+{cleaned_phone}")
    ).first()
    if lead:
        if not lead.conversation_id:
            lead.conversation_id = conv.id
        lead.last_activity_at = datetime.utcnow()
        try:
            recalculate_lead_score(lead, db, reason="agent_reply", commit=False)
        except Exception as e:
            logger.warning(f"Error recalculating lead score on template send: {e}")

    # Atomically debit WCC wallet ONLY when template message is successfully sent
    if wamid:
        try:
            rate_card = WCCService.get_active_rate(db, category, "IN")
            meta_cost = rate_card.meta_cost
            customer_price = rate_card.customer_price
        except Exception:
            fallbacks = {
                "marketing": (Decimal("1.09"), Decimal("1.25")),
                "utility": (Decimal("0.145"), Decimal("0.18")),
                "authentication": (Decimal("0.145"), Decimal("0.18")),
                "service": (Decimal("0.00"), Decimal("0.05"))
            }
            meta_cost, customer_price = fallbacks.get(category, (Decimal("1.09"), Decimal("1.25")))

        try:
            WCCService.debit_conversation_charge(
                db=db,
                workspace_id=ws_uuid,
                meta_session_id=str(wamid),
                category=category,
                meta_cost=meta_cost,
                customer_price=customer_price,
                raw_payload={
                    "action": "messages_send",
                    "phone": cleaned_phone,
                    "template_name": data.template_name,
                    "wamid": str(wamid)
                }
            )
        except Exception as e:
            logger.error(f"[WCC Debit] Error debiting template in /messages/send: {e}")

    db.commit()
    db.refresh(new_msg)

    return {
        "status": "sent",
        "wamid": wamid,
        "message_id": str(new_msg.id),
        "conversation_id": str(conv.id),
        "formatted_content": formatted_content,
        "meta_response": res_data
    }


@router.post("/templates/submit/{template_id}")
def submit_template(
    template_id: str, 
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(404, "Template not found")

    verify_workspace_access(current_user, db, template.workspace_id, required_permission='templates.manage')

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
            self.body_examples = None
            self.header_examples = None

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
        verify_workspace_access(current_user, db, str(template.workspace_id), required_permission='templates.manage')

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

    verify_workspace_access(current_user, db, template.workspace_id, required_permission='templates.manage')

    db.delete(template)
    db.commit()
    return {"status": "deleted"}
