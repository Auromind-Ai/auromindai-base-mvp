from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
import uuid
import time
import logging

from app.database import get_db
from app.routers.auth import get_current_user
from app.core.security import verify_workspace_access, to_uuid
from app.models.ai_agent import AIAgent
from app.models.brain import BrainEntry
from app.models.model_configs import ModelConfig
from app.services.config_service import config_service
from app.services.ai.agent_executor import execute_agent_conversation
from app.schemas.ai_agent import (
    AgentCreateRequest,
    AgentUpdateRequest,
    AgentStatusUpdateRequest,
    AgentTestChatRequest,
    AgentTestChatResponse,
    ValidateKeyRequest,
    ValidateKeyResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["ai_agents"])

def enrich_model_specs(model_id: str, default_name: Optional[str] = None, provider: Optional[str] = None) -> Dict[str, Any]:
    """Generates dynamic model capabilities and specs without any hardcoded dictionary."""
    norm_id = model_id.strip()
    lower = norm_id.lower()

    if default_name:
        display_name = default_name
    elif "/" in norm_id:
        parts = norm_id.split("/")
        display_name = f"{parts[-1].replace('-', ' ').title()} ({parts[0].capitalize()})"
    else:
        display_name = norm_id.replace('-', ' ').replace('_', ' ').title()

    p_str = (provider or "").lower()
    is_gemini = "gemini" in lower or p_str == "google"
    is_rec = False
    if is_gemini:
        is_rec = "flash" in lower and any(v in lower for v in ["1.5", "2.0", "2.5"])
    elif p_str == "groq":
        is_rec = "120b" in lower or "versatile" in lower

    return {
        "id": norm_id,
        "name": display_name,
        "description": f"{provider.capitalize() if provider else 'AI'} model loaded dynamically from API.",
        "contextWindow": 1048576 if is_gemini else 128000,
        "maxTokensLimit": 8192 if is_gemini else 4096,
        "supportsTools": True,
        "supportsStructuredOutput": True,
        "isRecommended": is_rec
    }


@router.get("/meta/models")
async def get_supported_models(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Returns dynamic model providers (Google, Groq), active DB models, platform key statuses and parameter ranges."""
    verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")

    google_key = config_service.get("google_api_key") or config_service.get("gemini_api_key") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    groq_key = config_service.get("groq_api_key") or os.getenv("GROQ_API_KEY")

    # Query active models configured in DB (ModelConfig table)
    db_configs = db.query(ModelConfig).filter(ModelConfig.is_active == True).all()
    db_models_by_provider: Dict[str, List[Dict[str, Any]]] = {}
    for cfg in db_configs:
        p = cfg.provider.lower()
        if p == "gemini":
            p = "google"
        if p not in ["google", "groq"]:
            continue
        if p not in db_models_by_provider:
            db_models_by_provider[p] = []
        db_models_by_provider[p].append(enrich_model_specs(cfg.model, default_name=cfg.display_name, provider=p))

    providers_response = []

    # 1. Google Provider (Dynamic models loaded via API Key)
    google_models = []
    if google_key:
        try:
            google_models = fetch_google_models_dynamic(google_key)
        except Exception as e:
            logger.warning(f"Failed to dynamically fetch Google models: {e}")
            google_models = []

    # Google models are exclusively dynamically fetched via API key

    providers_response.append({
        "provider": "google",
        "displayName": "Google",
        "hasPlatformKey": bool(google_key),
        "supportsBYOK": True,
        "models": google_models
    })

    # 2. Groq Provider (Dynamic models loaded via API Key)
    groq_models = []
    if groq_key:
        try:
            groq_models = fetch_groq_models_dynamic(groq_key)
        except Exception as e:
            logger.warning(f"Failed to dynamically fetch Groq models: {e}")
            groq_models = []

    if "groq" in db_models_by_provider:
        seen = {m["id"] for m in groq_models}
        for dbm in db_models_by_provider["groq"]:
            if dbm["id"] not in seen:
                groq_models.insert(0, dbm)
                seen.add(dbm["id"])

    providers_response.append({
        "provider": "groq",
        "displayName": "Groq",
        "hasPlatformKey": bool(groq_key),
        "supportsBYOK": True,
        "models": groq_models
    })

    return {
        "providers": providers_response,
        "parameter_ranges": {
            "temperature": {"min": 0.0, "max": 2.0, "default": 0.7, "step": 0.05},
            "max_tokens": {"min": 1, "max": 32768, "default": 1024, "step": 64},
            "top_p": {"min": 0.1, "max": 1.0, "default": 1.0, "step": 0.05},
            "frequency_penalty": {"min": -2.0, "max": 2.0, "default": 0.0, "step": 0.1},
            "presence_penalty": {"min": -2.0, "max": 2.0, "default": 0.0, "step": 0.1}
        }
    }


def fetch_google_models_dynamic(api_key: str) -> List[Dict[str, Any]]:
    """Dynamically loads Gemini models via Google GenAI API using provided API key."""
    from google import genai
    client = genai.Client(api_key=api_key)
    res = list(client.models.list())
    models_list = []
    seen = set()
    for m in res:
        name = getattr(m, 'name', '') or ''
        m_id = name.replace('models/', '').strip()
        if not m_id or m_id in seen:
            continue
        lower_id = m_id.lower()
        if 'embedding' in lower_id or 'aqa' in lower_id or 'imagen' in lower_id:
            continue
        if 'gemini' not in lower_id:
            continue

        supported_actions = getattr(m, 'supported_actions', None) or []
        if supported_actions and 'generateContent' not in supported_actions:
            continue

        display_name = getattr(m, 'display_name', None) or m_id
        description = getattr(m, 'description', None) or f"Google Gemini model {m_id}."
        input_limit = getattr(m, 'input_token_limit', None) or 1048576
        output_limit = getattr(m, 'output_token_limit', None) or 8192

        is_rec = ('flash' in lower_id and any(v in lower_id for v in ['1.5', '2.0', '2.5']))

        seen.add(m_id)
        models_list.append({
            'id': m_id,
            'name': display_name,
            'description': description,
            'contextWindow': input_limit,
            'maxTokensLimit': min(output_limit, 32768),
            'supportsTools': True,
            'supportsStructuredOutput': True,
            'isRecommended': is_rec
        })

    def rank(item):
        _id = item['id'].lower()
        if '2.5' in _id and 'flash' in _id: return 0
        if '2.0' in _id and 'flash' in _id: return 1
        if '1.5' in _id and 'flash' in _id: return 2
        if 'flash' in _id: return 3
        if '2.5' in _id and 'pro' in _id: return 4
        if '1.5' in _id and 'pro' in _id: return 5
        if 'pro' in _id: return 6
        return 10

    models_list.sort(key=lambda x: (rank(x), x['id']))
    return models_list


def fetch_groq_models_dynamic(api_key: str) -> List[Dict[str, Any]]:
    """Dynamically loads models via Groq API using provided API key."""
    from groq import Groq
    client = Groq(api_key=api_key)
    res = client.models.list()
    raw_models = []
    seen = set()
    for m in res.data:
        m_id = m.id
        if not m_id or m_id in seen:
            continue
        lower_id = m_id.lower()
        if 'whisper' in lower_id or 'safeguard' in lower_id or 'guard' in lower_id:
            continue
        seen.add(m_id)
        raw_models.append(enrich_model_specs(m_id, provider='groq'))

    raw_models.sort(key=lambda x: (not x.get('isRecommended', False), x['id']))
    return raw_models


@router.post("/meta/validate-key")
async def validate_user_api_key(
    payload: ValidateKeyRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Validates user's API key live with Google or Groq and discovers available models under their account."""
    verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")

    p = payload.provider.lower().strip()
    key = payload.api_key.strip()

    if not key:
        raise HTTPException(status_code=400, detail="API key is required.")

    if p not in ["google", "gemini", "groq"]:
        raise HTTPException(status_code=400, detail="Only Google and Groq providers are supported.")

    discovered_models = []
    try:
        if p in ["google", "gemini"]:
            discovered_models = fetch_google_models_dynamic(key)
            if not discovered_models:
                raise HTTPException(status_code=400, detail="No Gemini models found for this API key.")

            if getattr(payload, "save_key", True):
                try:
                    from app.services.platform_settings_service import update_settings
                    update_settings(db, {"google_api_key": key})
                except Exception as save_err:
                    logger.warning(f"Could not persist google_api_key in settings: {save_err}")

        elif p == "groq":
            discovered_models = fetch_groq_models_dynamic(key)
            if not discovered_models:
                raise HTTPException(status_code=400, detail="No models found for this Groq API key.")

            if getattr(payload, "save_key", True):
                try:
                    from app.services.platform_settings_service import update_settings
                    update_settings(db, {"groq_api_key": key})
                except Exception as save_err:
                    logger.warning(f"Could not persist groq_api_key in settings: {save_err}")

        return {
            "valid": True,
            "message": f"Successfully verified {p.capitalize()} API Key! Loaded {len(discovered_models)} models dynamically.",
            "models": discovered_models
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"User API key validation failed for provider {p}: {e}")
        err_str = str(e)
        if "API_KEY_INVALID" in err_str or "API key not valid" in err_str or "400" in err_str:
            detail = f"Invalid {p.capitalize()} API key. Please verify your key."
        elif "quota" in err_str.lower() or "429" in err_str:
            detail = f"{p.capitalize()} API key quota exceeded or rate limited."
        else:
            detail = f"Failed to validate key with {p.capitalize()}: {err_str[:120]}"
        raise HTTPException(status_code=400, detail=detail)

@router.get("/meta/channels")
async def get_channels_status(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Returns channels with confirmed backend connection status."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")

    # Inquire integrations & whatsapp
    from app.models.integration import Integration
    integrations = db.query(Integration).filter(
        Integration.workspace_id == to_uuid(ws_id),
        Integration.is_active == True
    ).all()
    connected_types = {i.integration_type.lower() for i in integrations}

    from app.models.workspace import Workspace
    ws = db.query(Workspace).filter(Workspace.id == to_uuid(ws_id)).first()
    has_whatsapp = "whatsapp" in connected_types or bool(ws and (getattr(ws, 'meta_phone_number_id', None) or (getattr(ws, 'meta_access_token', None) and not getattr(ws, 'meta_ig_id', None))))
    has_instagram = "instagram" in connected_types or bool(ws and (getattr(ws, 'meta_ig_id', None) or getattr(ws, 'meta_ig_access_token', None)))
    has_twilio = "twilio" in connected_types or bool(ws and getattr(ws, 'twilio_account_sid', None) and (getattr(ws, 'twilio_auth_token', None) or getattr(ws, 'twilio_phone_number', None)))

    # Only WhatsApp, Instagram, and Twilio messaging channels
    channels = [
        {
            "id": "whatsapp",
            "name": "WhatsApp Business",
            "description": "Connect your WhatsApp Business account",
            "icon": "whatsapp",
            "connected": has_whatsapp,
            "badgeText": "Connected" if has_whatsapp else "Not Connected"
        },
        {
            "id": "instagram",
            "name": "Instagram",
            "description": "Connect your Instagram Business account",
            "icon": "instagram",
            "connected": has_instagram,
            "badgeText": "Connected" if has_instagram else "Not Connected"
        },
        {
            "id": "twilio",
            "name": "Twilio SMS",
            "description": "Connect Twilio for SMS & phone messaging",
            "icon": "phone",
            "connected": has_twilio,
            "badgeText": "Connected" if has_twilio else "Not Connected"
        }
    ]

    return {"channels": channels}


@router.get("/draft")
async def get_agent_draft(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Retrieve persisted agent creation wizard draft from PostgreSQL."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    draft = db.query(AIAgent).filter(
        AIAgent.workspace_id == to_uuid(ws_id),
        AIAgent.is_draft == True
    ).order_by(AIAgent.created_at.desc()).first()

    return {"draft": draft.to_dict() if draft else None}


@router.post("/draft")
async def save_agent_draft(
    draft_data: Dict[str, Any],
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Persist agent creation wizard draft to PostgreSQL to preserve work-in-progress across sessions."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    draft = db.query(AIAgent).filter(
        AIAgent.workspace_id == to_uuid(ws_id),
        AIAgent.is_draft == True
    ).first()

    name = (draft_data.get("name") or "").strip() or "Untitled Draft Agent"

    if not draft:
        draft = AIAgent(
            workspace_id=to_uuid(ws_id),
            created_by=to_uuid(current_user.id),
            name=name,
            description=draft_data.get("description"),
            agent_type=draft_data.get("agent_type", "sales_assistant"),
            avatar_url=draft_data.get("avatar_url"),
            language=draft_data.get("language", "English (India)"),
            tone_of_voice=draft_data.get("tone_of_voice", "Friendly & Professional"),
            business_name=draft_data.get("business_name"),
            website_url=draft_data.get("website_url"),
            status="draft",
            is_draft=True,
            channels_config=draft_data.get("channels_config") or {},
            channel_settings=draft_data.get("channel_settings") or {},
            ai_config=draft_data.get("ai_config") or {},
            knowledge_config=draft_data.get("knowledge_config") or {},
            conversations_count={"total": 0, "active": 0}
        )
        db.add(draft)
    else:
        draft.name = name
        draft.description = draft_data.get("description", draft.description)
        draft.agent_type = draft_data.get("agent_type", draft.agent_type)
        draft.avatar_url = draft_data.get("avatar_url", draft.avatar_url)
        draft.language = draft_data.get("language", draft.language)
        draft.tone_of_voice = draft_data.get("tone_of_voice", draft.tone_of_voice)
        draft.business_name = draft_data.get("business_name", draft.business_name)
        draft.website_url = draft_data.get("website_url", draft.website_url)
        draft.status = "draft"
        draft.is_draft = True
        draft.channels_config = draft_data.get("channels_config", draft.channels_config)
        draft.channel_settings = draft_data.get("channel_settings", draft.channel_settings)
        draft.ai_config = draft_data.get("ai_config", draft.ai_config)
        draft.knowledge_config = draft_data.get("knowledge_config", draft.knowledge_config)

    db.commit()
    db.refresh(draft)
    return {"status": "saved", "draft": draft.to_dict()}


@router.delete("/draft")
async def clear_agent_draft(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Clear wizard draft upon successful creation or cancellation from PostgreSQL."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    db.query(AIAgent).filter(
        AIAgent.workspace_id == to_uuid(ws_id),
        AIAgent.is_draft == True
    ).delete()
    db.commit()
    return {"status": "cleared"}


@router.get("")
async def list_agents(
    workspace_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List AI Agents for the workspace with optional status filter and search query."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")

    query = db.query(AIAgent).filter(AIAgent.workspace_id == to_uuid(ws_id))

    if status_filter and status_filter.lower() == "drafts":
        query = query.filter((AIAgent.status == "draft") | (AIAgent.is_draft == True))
    elif status_filter and status_filter.lower() != "all":
        query = query.filter(AIAgent.status == status_filter.lower(), AIAgent.is_draft == False)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (AIAgent.name.ilike(search_pattern)) |
            (AIAgent.description.ilike(search_pattern)) |
            (AIAgent.business_name.ilike(search_pattern))
        )

    agents = query.order_by(AIAgent.created_at.desc()).all()
    return {"agents": [a.to_dict() for a in agents]}


@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get single agent details."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    agent_uuid = to_uuid(agent_id)
    if not agent_uuid:
        raise HTTPException(status_code=400, detail="Invalid agent ID")

    agent = db.query(AIAgent).filter(
        AIAgent.id == agent_uuid,
        AIAgent.workspace_id == to_uuid(ws_id)
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found in workspace")

    return {"agent": agent.to_dict()}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_agent(
    request: AgentCreateRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create a new AI Agent."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")

    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Agent name is required")

    # Enforce Custom System Prompt requirement for active agents
    if not request.is_draft:
        ai_cfg = request.ai_config or {}
        sys_prompt = (ai_cfg.get("system_prompt") or "").strip()
        if not sys_prompt:
            raise HTTPException(
                status_code=400,
                detail="Custom System Prompt is required. Please define how your AI agent should interact and operate."
            )

    # Prevent duplicate active agents with exact same name in the same workspace
    existing = db.query(AIAgent).filter(
        AIAgent.workspace_id == to_uuid(ws_id),
        AIAgent.name.ilike(request.name.strip()),
        AIAgent.is_draft == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An agent named '{request.name.strip()}' already exists in this workspace."
        )

    knowledge_conf = (request.knowledge_config or {}).copy()
    collection_tag = knowledge_conf.get("collection")
    if not collection_tag:
        collection_tag = f"agent_{uuid.uuid4().hex[:12]}"
        knowledge_conf["collection"] = collection_tag

    new_agent = AIAgent(
        workspace_id=to_uuid(ws_id),
        created_by=to_uuid(current_user.id),
        name=request.name.strip(),
        description=request.description,
        agent_type=request.agent_type,
        avatar_url=request.avatar_url,
        language=request.language,
        tone_of_voice=request.tone_of_voice,
        business_name=request.business_name,
        website_url=request.website_url,
        status="active",
        is_draft=request.is_draft,
        channels_config=request.channels_config or {},
        channel_settings=request.channel_settings or {},
        ai_config=request.ai_config or {},
        knowledge_config=knowledge_conf,
        conversations_count={"total": 0, "active": 0}
    )

    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)

    # Auto-index FAQs into vector DB under this agent's unique collection tag
    faqs = knowledge_conf.get("faqs", [])
    if faqs:
        try:
            from app.services.agentic_rag.rag_service import get_rag_service
            rag = get_rag_service()
            updated_faqs = False
            for faq in faqs:
                q = faq.get("question", "").strip()
                a = faq.get("answer", "").strip()
                if q and a and not faq.get("entry_id"):
                    try:
                        entry = rag.ingest_document(
                            db=db,
                            workspace_id=str(ws_id),
                            text=f"Question: {q}\nAnswer: {a}",
                            title=f"FAQ: {q[:50]}",
                            content_type="faq",
                            source="agent_faq",
                            metadata={
                                "collection": collection_tag,
                                "agent_id": str(new_agent.id),
                                "question": q
                            },
                            file_name=f"FAQ-{q[:30]}",
                            file_size=len(q) + len(a),
                            credits_charged=0.0,
                            embedding_status="completed"
                        )
                        faq["entry_id"] = str(entry.id)
                        updated_faqs = True
                    except Exception as f_err:
                        logger.warning(f"Failed to ingest FAQ into vector store: {f_err}")
            if updated_faqs:
                new_agent.knowledge_config = {**knowledge_conf, "faqs": faqs}
                db.commit()
                db.refresh(new_agent)
        except Exception as rag_err:
            logger.warning(f"Error accessing rag service during agent creation: {rag_err}")

    # Clear saved draft upon successful creation from DB
    try:
        db.query(AIAgent).filter(
            AIAgent.workspace_id == to_uuid(ws_id),
            AIAgent.is_draft == True
        ).delete()
        db.commit()
    except Exception as d_err:
        logger.warning(f"Failed to clear draft on agent creation: {d_err}")

    return {"agent": new_agent.to_dict(), "message": "Agent created successfully"}


@router.put("/{agent_id}")
async def update_agent(
    agent_id: str,
    request: AgentUpdateRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update existing agent configuration."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    agent_uuid = to_uuid(agent_id)
    if not agent_uuid:
        raise HTTPException(status_code=400, detail="Invalid agent ID")

    agent = db.query(AIAgent).filter(
        AIAgent.id == agent_uuid,
        AIAgent.workspace_id == to_uuid(ws_id)
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found in workspace")

    if request.ai_config is not None:
        target_draft = request.is_draft if request.is_draft is not None else agent.is_draft
        target_status = request.status if request.status is not None else agent.status
        if not target_draft and target_status == "active":
            sys_prompt = (request.ai_config.get("system_prompt") or "").strip()
            if not sys_prompt:
                raise HTTPException(
                    status_code=400,
                    detail="Custom System Prompt is required for active agents."
                )

    fields = [
        "name", "description", "agent_type", "avatar_url", "language",
        "tone_of_voice", "business_name", "website_url", "channels_config",
        "channel_settings", "ai_config", "status", "is_draft"
    ]
    for field in fields:
        val = getattr(request, field, None)
        if val is not None:
            setattr(agent, field, val)

    if request.knowledge_config is not None:
        kc = dict(request.knowledge_config)
        existing_kc = agent.knowledge_config or {}
        if not kc.get("collection"):
            kc["collection"] = existing_kc.get("collection") or f"agent_{agent.id}"
        agent.knowledge_config = kc

        faqs = kc.get("faqs", [])
        if faqs:
            try:
                from app.services.agentic_rag.rag_service import get_rag_service
                rag = get_rag_service()
                updated_faqs = False
                for faq in faqs:
                    q = faq.get("question", "").strip()
                    a = faq.get("answer", "").strip()
                    if q and a and not faq.get("entry_id"):
                        try:
                            entry = rag.ingest_document(
                                db=db,
                                workspace_id=str(ws_id),
                                text=f"Question: {q}\nAnswer: {a}",
                                title=f"FAQ: {q[:50]}",
                                content_type="faq",
                                source="agent_faq",
                                metadata={
                                    "collection": kc["collection"],
                                    "agent_id": str(agent.id),
                                    "question": q
                                },
                                file_name=f"FAQ-{q[:30]}",
                                file_size=len(q) + len(a),
                                credits_charged=0.0,
                                embedding_status="completed"
                            )
                            faq["entry_id"] = str(entry.id)
                            updated_faqs = True
                        except Exception as f_err:
                            logger.warning(f"Failed to ingest FAQ in update: {f_err}")
                if updated_faqs:
                    agent.knowledge_config = {**kc, "faqs": faqs}
            except Exception as rag_err:
                logger.warning(f"Error indexing FAQs on agent update: {rag_err}")

    db.commit()
    db.refresh(agent)
    return {"agent": agent.to_dict(), "message": "Agent updated successfully"}


@router.patch("/{agent_id}/status")
async def toggle_agent_status(
    agent_id: str,
    status_update: AgentStatusUpdateRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Toggle agent status between active and paused."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    agent_uuid = to_uuid(agent_id)
    if not agent_uuid:
        raise HTTPException(status_code=400, detail="Invalid agent ID")

    agent = db.query(AIAgent).filter(
        AIAgent.id == agent_uuid,
        AIAgent.workspace_id == to_uuid(ws_id)
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found in workspace")

    agent.status = status_update.status
    db.commit()
    db.refresh(agent)
    return {"agent": agent.to_dict(), "status": agent.status}


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Delete an AI agent."""
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")
    agent_uuid = to_uuid(agent_id)
    if not agent_uuid:
        raise HTTPException(status_code=400, detail="Invalid agent ID")

    agent = db.query(AIAgent).filter(
        AIAgent.id == agent_uuid,
        AIAgent.workspace_id == to_uuid(ws_id)
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found in workspace")

    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully", "id": agent_id}


@router.post("/test-chat", response_model=AgentTestChatResponse)
async def test_agent_chat(
    request: AgentTestChatRequest,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Test agent conversation in a safe sandbox test environment.
    Uses agent configuration, workspace knowledge base context, and selected channel tone.
    Never sends live customer messages or external actions.
    Never exposes internal system prompt or secrets in the reply.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="ai.chat")

    agent_config: Dict[str, Any] = {}

    if request.agent_id:
        agent_uuid = to_uuid(request.agent_id)
        if agent_uuid:
            agent = db.query(AIAgent).filter(
                AIAgent.id == agent_uuid,
                AIAgent.workspace_id == to_uuid(ws_id)
            ).first()
            if agent:
                agent_config = agent.to_dict()

    if not agent_config and request.draft_config:
        agent_config = request.draft_config

    result = await execute_agent_conversation(
        agent_config=agent_config,
        message=request.message,
        conversation_history=request.conversation_history,
        channel=request.channel or "whatsapp",
        db=db,
        workspace_id=str(ws_id)
    )

    return AgentTestChatResponse(
        reply=result["reply"],
        channel=result["channel"],
        model_used=result["model_used"],
        sources_used=result["sources_used"],
        execution_time_ms=result["execution_time_ms"]
    )
