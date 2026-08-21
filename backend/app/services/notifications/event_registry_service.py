import logging
import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session

logger = logging.getLogger("app")


def get_base_frontend_url() -> str:
    try:
        from app.core.config import settings
        raw_url = getattr(settings, "FRONTEND_URL", None)
        return (raw_url or "http://localhost:3000").rstrip("/")
    except Exception:
        return "http://localhost:3000"


def build_action_url(action_route: Optional[str] = None, base_app_url: Optional[str] = None) -> str:
    base_url = (base_app_url or get_base_frontend_url()).rstrip("/")
    if not action_route:
        return f"{base_url}/user/admin/dashboard"

    action_route = str(action_route).strip()
    if action_route.startswith("http://") or action_route.startswith("https://"):
        return action_route

    if not action_route.startswith("/"):
        action_route = "/" + action_route

    # Public routes that should not have /user/admin prefix
    public_prefixes = ("/login", "/signup", "/verify-otp", "/reset-password", "/pricing")
    for pub in public_prefixes:
        if action_route == pub or action_route.startswith(pub + "?") or action_route.startswith(pub + "/"):
            return f"{base_url}{action_route}"

    if action_route.startswith("/user/admin"):
        return f"{base_url}{action_route}"

    return f"{base_url}/user/admin{action_route}"


def _normalize_event_key(k: str) -> str:
    if not k:
        return ""
    return (
        k.lower()
        .replace("_", "")
        .replace(".", "")
        .replace("succeeded", "success")
        .replace("signup", "welcome")
        .replace("purchased", "purchase")
        .strip()
    )


def _sanitize_sample_value(val: Any) -> Any:
    if val is None:
        return ""
    if isinstance(val, (str, int, float, bool)):
        return val
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (list, tuple)):
        return [_sanitize_sample_value(x) for x in val[:5]]
    if isinstance(val, dict):
        return {str(k): _sanitize_sample_value(v) for k, v in list(val.items())[:10]}
    return str(val)


class EventRegistryService:
    

    _DISCOVERED_CACHE: Dict[str, Dict[str, Any]] = {}
    _METADATA_CACHE: Dict[str, Dict[str, Any]] = {}
    _SYS_VARS_CACHE: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def clear_cache(cls) -> None:
        cls._DISCOVERED_CACHE.clear()
        cls._METADATA_CACHE.clear()
        cls._SYS_VARS_CACHE = None

    
    # System Variables (Database Source of Truth)
    

    @classmethod
    def get_system_variables(cls, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        
        if cls._SYS_VARS_CACHE is not None:
            return cls._SYS_VARS_CACHE

        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")

        def _query_db(session: Session) -> Optional[List[Dict[str, Any]]]:
            try:
                from app.models.notification_system_variable import NotificationSystemVariable
                rows = session.query(NotificationSystemVariable).filter(
                    NotificationSystemVariable.is_active == True
                ).order_by(NotificationSystemVariable.created_at.asc()).all()
                if rows:
                    return [
                        {
                            "key": r.key,
                            "sample": r.sample_value or "",
                            "description": r.description or r.key.replace("_", " ").title(),
                            "required": False
                        }
                        for r in rows
                    ]
            except Exception as e:
                logger.debug(f"[EventRegistryService] DB system variables query error: {e}")
            return None

        result = None
        if db is not None:
            result = _query_db(db)
        else:
            try:
                from app.database import SessionLocal
                with SessionLocal() as session:
                    result = _query_db(session)
            except Exception:
                pass

        if result is not None and len(result) > 0:
            cls._SYS_VARS_CACHE = result
            return result

        # Fallback system variable keys if DB is offline/uninitialized
        fallback_sys_vars = [
            {"key": "user_name", "sample": "demo", "description": "Recipient first or full name", "required": False},
            {"key": "workspace_name", "sample": "Demo Workspace", "description": "Active workspace tenant name", "required": False},
            {"key": "app_name", "sample": "Orbion Agents", "description": "Application platform brand name", "required": False},
            {"key": "email", "sample": "demo@example.com", "description": "Recipient email address", "required": False},
            {"key": "frontend_url", "sample": get_base_frontend_url(), "description": "Frontend root URL", "required": False},
            {"key": "action_url", "sample": build_action_url("/dashboard"), "description": "Call-to-action button destination URL", "required": False},
            {"key": "action_label", "sample": "Open Application", "description": "Call-to-action button text", "required": False},
            {"key": "action_route", "sample": "/dashboard", "description": "Canonical route path", "required": False},
        ]
        return fallback_sys_vars

    @classmethod
    def get_system_variable_keys(cls, db: Optional[Session] = None) -> Set[str]:
        """Returns set of all active system variable keys from DB."""
        sys_vars = cls.get_system_variables(db=db)
        return {v["key"] for v in sys_vars}

  
    # Runtime Payload Discovery & Recording
   
    @classmethod
    def record_payload(
        cls,
        event_name: str,
        payload: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None
    ) -> None:
        
        if not event_name or not payload or not isinstance(payload, dict):
            return

        try:
            # 1. Sanitize and extract dynamic payload keys
            cleaned_samples = {}
            for k, v in payload.items():
                if k.startswith("_"):
                    continue
                cleaned_samples[k] = _sanitize_sample_value(v)

            discovered_keys = set(cleaned_samples.keys())
            now = datetime.now(timezone.utc)
            meta = cls.get_event_metadata(event_name, db=db)
            template_key = meta.get("template_key") if meta else event_name.replace(".", "_")

            # 2. Update In-Memory Discovery Cache
            entry = {
                "event_name": event_name,
                "template_key": template_key,
                "discovered_keys": discovered_keys,
                "sample_payload": cleaned_samples,
                "last_seen_at": now
            }
            if event_name not in cls._DISCOVERED_CACHE:
                cls._DISCOVERED_CACHE[event_name] = entry
            else:
                existing = cls._DISCOVERED_CACHE[event_name]
                existing["discovered_keys"].update(discovered_keys)
                existing["sample_payload"].update(cleaned_samples)
                existing["last_seen_at"] = now
                existing["template_key"] = template_key
                entry = existing

            cls._DISCOVERED_CACHE[template_key] = entry
            cls._DISCOVERED_CACHE[_normalize_event_key(event_name)] = entry
            cls._DISCOVERED_CACHE[_normalize_event_key(template_key)] = entry

            # 3. Persist to Database if DB session available
            if db is not None:
                cls._upsert_db_payload_schema(
                    db=db,
                    event_name=event_name,
                    template_key=template_key,
                    discovered_keys=entry["discovered_keys"],
                    samples=entry["sample_payload"],
                    now=now
                )
                cls._ensure_metadata_exists(db, event_name, template_key)
        except Exception as err:
            logger.debug(f"[EventRegistryService] Dynamic payload discovery error: {err}")

    @classmethod
    def _upsert_db_payload_schema(
        cls,
        db: Session,
        event_name: str,
        template_key: str,
        discovered_keys: Set[str],
        samples: Dict[str, Any],
        now: datetime
    ) -> None:
        try:
            from app.models.event_payload_schema import EventPayloadSchema

            schema_record = db.query(EventPayloadSchema).filter(
                (EventPayloadSchema.event_name == event_name) | (EventPayloadSchema.template_key == template_key)
            ).first()

            keys_list = sorted(list(discovered_keys))
            samples_dict = {k: samples[k] for k in keys_list if k in samples}

            if schema_record:
                existing_keys = set(schema_record.discovered_keys or [])
                existing_samples = dict(schema_record.sample_payload or {})
                existing_keys.update(keys_list)
                existing_samples.update(samples_dict)
                schema_record.discovered_keys = sorted(list(existing_keys))
                schema_record.sample_payload = existing_samples
                schema_record.last_seen_at = now
            else:
                schema_record = EventPayloadSchema(
                    id=uuid.uuid4(),
                    event_name=event_name,
                    template_key=template_key,
                    category=cls._infer_category(event_name),
                    discovered_keys=keys_list,
                    sample_payload=samples_dict,
                    last_seen_at=now
                )
                db.add(schema_record)

            db.flush()
        except Exception as err:
            logger.debug(f"[EventRegistryService] DB upsert failed for '{event_name}': {err}")

    @classmethod
    def _ensure_metadata_exists(cls, db: Session, event_name: str, template_key: str) -> None:
        try:
            from app.models.event_metadata import EventMetadata
            existing = db.query(EventMetadata).filter(
                (EventMetadata.event_name == event_name) | (EventMetadata.template_key == template_key)
            ).first()

            if not existing:
                meta_record = EventMetadata(
                    id=uuid.uuid4(),
                    event_name=event_name,
                    template_key=template_key,
                    name=event_name.replace(".", " ").replace("_", " ").title(),
                    category=cls._infer_category(event_name),
                    description=f"Auto-registered event metadata for {event_name}",
                    allowed_channels=cls._infer_channels(event_name),
                    action_route="/dashboard",
                    action_label="Open Application",
                    supports_subject=True,
                    is_active=True
                )
                db.add(meta_record)
                db.flush()
                cls._cache_metadata_record(meta_record)
        except Exception as err:
            logger.debug(f"[EventRegistryService] Auto-create metadata failed for '{event_name}': {err}")

    @classmethod
    def _cache_metadata_record(cls, meta_record: Any) -> Dict[str, Any]:
        entry = {
            "event_name": meta_record.event_name,
            "template_key": meta_record.template_key,
            "name": meta_record.name,
            "category": meta_record.category,
            "description": meta_record.description or "",
            "allowed_channels": meta_record.allowed_channels or ["email", "in_app"],
            "action_route": meta_record.action_route or "/dashboard",
            "action_label": meta_record.action_label or "Open Application",
            "supports_subject": bool(meta_record.supports_subject),
            "is_active": bool(meta_record.is_active)
        }
        cls._METADATA_CACHE[meta_record.event_name] = entry
        cls._METADATA_CACHE[meta_record.template_key] = entry
        cls._METADATA_CACHE[_normalize_event_key(meta_record.event_name)] = entry
        cls._METADATA_CACHE[_normalize_event_key(meta_record.template_key)] = entry
        return entry

    @classmethod
    def _infer_channels(cls, event_name: str) -> List[str]:
        if "otp" in event_name.lower() or "verification" in event_name.lower():
            return ["email"]
        return ["email", "in_app"]

    @classmethod
    def _infer_category(cls, event_name: str) -> str:
        prefix = event_name.split(".")[0].lower() if "." in event_name else ""
        if prefix in ("user", "onboarding", "plan"):
            return "User & Onboarding"
        if prefix in ("payment", "credits", "ai_credits", "wcc", "wcc_wallet", "subscription", "billing", "invoice"):
            return "Payments & Credits"
        if prefix in ("lead", "crm", "sales"):
            return "Lead Management"
        if prefix in ("broadcast", "workflow", "automation", "flow", "flow_executions"):
            return "Broadcast & Workflow"
        if prefix in ("report", "metrics", "analytics"):
            return "Reports"
        if prefix in ("security", "auth", "session", "device"):
            return "Security"
        return "General"

    
    # Metadata Queries
    

    @classmethod
    def get_event_metadata(cls, key_or_event: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """Fetches event display and routing metadata directly from DB event_metadata table."""
        if not key_or_event:
            return None

        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")

        # 1. In-Memory Cache
        if key_or_event in cls._METADATA_CACHE:
            return cls._METADATA_CACHE[key_or_event]

        target_norm = _normalize_event_key(key_or_event)
        for k, cached in cls._METADATA_CACHE.items():
            if _normalize_event_key(k) == target_norm:
                return cached
            if _normalize_event_key(cached.get("template_key", "")) == target_norm:
                return cached
            if _normalize_event_key(cached.get("event_name", "")) == target_norm:
                return cached

        # 2. Query DB
        def _query_db(session: Session):
            from app.models.event_metadata import EventMetadata
            rec = session.query(EventMetadata).filter(
                (EventMetadata.event_name == key_or_event) |
                (EventMetadata.template_key == key_or_event) |
                (EventMetadata.event_name == key_or_event.replace("_", ".")) |
                (EventMetadata.template_key == key_or_event.replace(".", "_"))
            ).first()
            if rec:
                return cls._cache_metadata_record(rec)
            return None

        if db is not None:
            res = _query_db(db)
            if res:
                return res
        else:
            try:
                from app.database import SessionLocal
                with SessionLocal() as session:
                    res = _query_db(session)
                    if res:
                        return res
            except Exception:
                pass

        # 3. Dynamic metadata fallback for unknown custom events
        event_name = key_or_event.replace("_", ".") if "." not in key_or_event else key_or_event
        template_key = key_or_event.replace(".", "_") if "_" not in key_or_event else key_or_event
        fallback_meta = {
            "event_name": event_name,
            "template_key": template_key,
            "name": event_name.replace(".", " ").replace("_", " ").title(),
            "category": cls._infer_category(event_name),
            "description": f"Dynamic event metadata for {event_name}",
            "allowed_channels": cls._infer_channels(event_name),
            "action_route": "/dashboard",
            "action_label": "Open Application",
            "supports_subject": True,
            "is_active": True
        }
        cls._METADATA_CACHE[event_name] = fallback_meta
        cls._METADATA_CACHE[template_key] = fallback_meta
        return fallback_meta

    
    # Discovered Payload Schema Queries
    

    @classmethod
    def get_discovered_schema(cls, key_or_event: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """Returns dynamically discovered keys and sample payload for an event name or template key."""
        if not key_or_event:
            return {"discovered_keys": set(), "sample_payload": {}, "last_seen_at": None}

        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")

        # 1. In-Memory Cache
        if key_or_event in cls._DISCOVERED_CACHE:
            return cls._DISCOVERED_CACHE[key_or_event]
        if key_or_event.replace(".", "_") in cls._DISCOVERED_CACHE:
            return cls._DISCOVERED_CACHE[key_or_event.replace(".", "_")]
        if key_or_event.replace("_", ".") in cls._DISCOVERED_CACHE:
            return cls._DISCOVERED_CACHE[key_or_event.replace("_", ".")]

        target_norm = _normalize_event_key(key_or_event)
        for cached in cls._DISCOVERED_CACHE.values():
            if cached.get("template_key") == key_or_event or cached.get("event_name") == key_or_event:
                return cached
            if _normalize_event_key(cached.get("event_name", "")) == target_norm:
                return cached
            if _normalize_event_key(cached.get("template_key", "")) == target_norm:
                return cached

        # Check metadata for mapped event_name / template_key
        meta = cls.get_event_metadata(key_or_event, db=db)
        if meta:
            evt = meta.get("event_name")
            tpl = meta.get("template_key")
            if evt and evt in cls._DISCOVERED_CACHE:
                return cls._DISCOVERED_CACHE[evt]
            if tpl and tpl in cls._DISCOVERED_CACHE:
                return cls._DISCOVERED_CACHE[tpl]

        # 2. Query Database
        def _query_db(session: Session):
            from app.models.event_payload_schema import EventPayloadSchema
            rec = session.query(EventPayloadSchema).filter(
                (EventPayloadSchema.event_name == key_or_event) |
                (EventPayloadSchema.template_key == key_or_event) |
                (EventPayloadSchema.event_name == key_or_event.replace("_", ".")) |
                (EventPayloadSchema.template_key == key_or_event.replace(".", "_"))
            ).first()

            if rec:
                entry = {
                    "event_name": rec.event_name,
                    "template_key": rec.template_key,
                    "discovered_keys": set(rec.discovered_keys or []),
                    "sample_payload": rec.sample_payload or {},
                    "last_seen_at": rec.last_seen_at
                }
                cls._DISCOVERED_CACHE[rec.event_name] = entry
                cls._DISCOVERED_CACHE[rec.template_key] = entry
                cls._DISCOVERED_CACHE[_normalize_event_key(rec.event_name)] = entry
                cls._DISCOVERED_CACHE[_normalize_event_key(rec.template_key)] = entry
                return entry
            return None

        if db is not None:
            res = _query_db(db)
            if res:
                return res
        else:
            try:
                from app.database import SessionLocal
                with SessionLocal() as session:
                    res = _query_db(session)
                    if res:
                        return res
            except Exception:
                pass

        return {"discovered_keys": set(), "sample_payload": {}, "last_seen_at": None}

    
    # Contract Merging & Serialization
    

    @classmethod
    def get_merged_contract(cls, key_or_event: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")
        meta = cls.get_event_metadata(key_or_event, db=db)
        event_name = meta.get("event_name") if meta else (key_or_event.replace("_", ".") if "." not in key_or_event else key_or_event)
        template_key = meta.get("template_key") if meta else (key_or_event.replace(".", "_") if "_" not in key_or_event else key_or_event)
        category = meta.get("category", "General") if meta else cls._infer_category(event_name)
        name = meta.get("name", event_name.replace(".", " ").replace("_", " ").title()) if meta else event_name.replace(".", " ").title()
        description = meta.get("description", f"Event contract for {name}") if meta else f"Dynamic contract for {name}"
        allowed_channels = meta.get("allowed_channels", ["email", "in_app"]) if meta else cls._infer_channels(event_name)
        supports_subject = meta.get("supports_subject", True) if meta else True
        action_route = meta.get("action_route", "/dashboard") if meta else "/dashboard"
        action_label = meta.get("action_label", "Open Application") if meta else "Open Application"

        base_app_url = get_base_frontend_url()
        resolved_action_url = build_action_url(action_route, base_app_url)

        # Discovered event payload schema from DB / cache
        discovered = cls.get_discovered_schema(key_or_event, db=db)
        if not discovered.get("discovered_keys") and template_key:
            discovered = cls.get_discovered_schema(template_key, db=db)
        if not discovered.get("discovered_keys") and event_name:
            discovered = cls.get_discovered_schema(event_name, db=db)

        disc_keys = discovered.get("discovered_keys", set())
        disc_samples = discovered.get("sample_payload", {})

        # System Variables from DB
        system_vars_defs = cls.get_system_variables(db=db)
        system_keys = {sv["key"] for sv in system_vars_defs}

        # 1. Event Payload Variables (Exclusively event-specific payload keys)
        event_payload_vars = []
        for k in sorted(disc_keys):
            if k not in system_keys:
                sample_val = disc_samples.get(k, f"[{k}]")
                event_payload_vars.append({
                    "key": k,
                    "sample": sample_val,
                    "description": k.replace("_", " ").title(),
                    "required": False
                })

        # 2. Dynamic System Context & System Variables List
        sys_context: Dict[str, Any] = {}
        for sv in system_vars_defs:
            sys_context[sv["key"]] = sv.get("sample", "")

        # Override dynamically calculated runtime variables
        try:
            from app.core.config import settings
            app_name_setting = getattr(settings, "APP_NAME", None)
            if app_name_setting:
                sys_context["app_name"] = app_name_setting
        except Exception:
            pass

        sys_context["frontend_url"] = base_app_url
        sys_context["action_route"] = action_route
        sys_context["action_label"] = action_label
        sys_context["action_url"] = resolved_action_url

        system_vars_list = [
            {
                "key": sv["key"],
                "sample": sys_context.get(sv["key"], sv.get("sample", "")),
                "description": sv.get("description", sv["key"].replace("_", " ").title()),
                "required": False
            }
            for sv in system_vars_defs
        ]

        return {
            "event_name": event_name,
            "template_key": template_key,
            "category": category,
            "name": name,
            "description": description,
            "allowed_channels": allowed_channels,
            "supports_subject": supports_subject,
            "action_route": action_route,
            "action_label": action_label,
            "action_url": resolved_action_url,
            "variables": event_payload_vars,
            "system_variables": system_vars_list,
            "sample_payload": disc_samples,
            "system_context": sys_context
        }

    @classmethod
    def get_all_merged_contracts(cls, db: Optional[Session] = None) -> Dict[str, Dict[str, Any]]:
        merged_all: Dict[str, Dict[str, Any]] = {}
        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")

        def _fetch_all_metadata(session: Session) -> List[Any]:
            try:
                from app.models.event_metadata import EventMetadata
                return session.query(EventMetadata).filter(EventMetadata.is_active == True).all()
            except Exception:
                return []

        metadata_records = []
        if db is not None:
            metadata_records = _fetch_all_metadata(db)
        else:
            try:
                from app.database import SessionLocal
                with SessionLocal() as session:
                    metadata_records = _fetch_all_metadata(session)
            except Exception:
                pass

        for rec in metadata_records:
            cls._cache_metadata_record(rec)
            merged = cls.get_merged_contract(rec.template_key, db=db)
            if merged:
                merged_all[rec.template_key] = merged

        for cached in list(cls._METADATA_CACHE.values()):
            t_key = cached.get("template_key")
            if t_key and t_key not in merged_all:
                merged = cls.get_merged_contract(t_key, db=db)
                if merged:
                    merged_all[t_key] = merged

        for evt_name, disc_entry in list(cls._DISCOVERED_CACHE.items()):
            t_key = disc_entry.get("template_key") or evt_name.replace(".", "_")
            if t_key not in merged_all:
                dynamic_c = cls.get_merged_contract(evt_name, db=db)
                if dynamic_c:
                    merged_all[t_key] = dynamic_c

        # Guarantee 100% coverage of all notification templates in database
        try:
            from app.models.notification_template import NotificationTemplate
            tpl_records = db.query(NotificationTemplate).all() if db is not None else []
            for tpl in tpl_records:
                if tpl.template_key and tpl.template_key not in merged_all:
                    merged = cls.get_merged_contract(tpl.template_key, db=db)
                    if merged:
                        merged_all[tpl.template_key] = merged
        except Exception:
            pass

        # Guarantee 100% coverage of all payload schemas in database
        try:
            from app.models.event_payload_schema import EventPayloadSchema
            schema_records = db.query(EventPayloadSchema).all() if db is not None else []
            for sch in schema_records:
                if sch.template_key and sch.template_key not in merged_all:
                    merged = cls.get_merged_contract(sch.template_key, db=db)
                    if merged:
                        merged_all[sch.template_key] = merged
        except Exception:
            pass

        return merged_all

    @classmethod
    def get_allowed_placeholder_keys(cls, key_or_event: str, db: Optional[Session] = None) -> Set[str]:
        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")
        allowed: Set[str] = set(cls.get_system_variable_keys(db=db))

        # Discovered event payload variables
        discovered = cls.get_discovered_schema(key_or_event, db=db)
        allowed.update(discovered.get("discovered_keys", set()))
        if discovered.get("sample_payload"):
            allowed.update(discovered["sample_payload"].keys())

        # Check mapped event_name / template_key
        meta = cls.get_event_metadata(key_or_event, db=db)
        if meta:
            evt_name = meta.get("event_name")
            if evt_name and evt_name != key_or_event:
                d2 = cls.get_discovered_schema(evt_name, db=db)
                allowed.update(d2.get("discovered_keys", set()))
                if d2.get("sample_payload"):
                    allowed.update(d2["sample_payload"].keys())

        return allowed

    @classmethod
    def get_sample_context(cls, key_or_event: str, db: Optional[Session] = None) -> Dict[str, Any]:
        if db is not None and not isinstance(db, Session):
            raise ValueError("A valid SQLAlchemy Session is required.")
        contract = cls.get_merged_contract(key_or_event, db=db)
        base_app_url = get_base_frontend_url()

        sample_ctx: Dict[str, Any] = {}
        if contract and contract.get("system_context"):
            sample_ctx.update(contract["system_context"])
        else:
            sys_vars = cls.get_system_variables(db=db)
            for sv in sys_vars:
                sample_ctx[sv["key"]] = sv.get("sample", "")
            action_route = contract.get("action_route", "/dashboard") if contract else "/dashboard"
            sample_ctx["action_route"] = action_route
            sample_ctx["action_label"] = contract.get("action_label", "Open Application") if contract else "Open Application"
            sample_ctx["frontend_url"] = base_app_url
            sample_ctx["action_url"] = build_action_url(action_route, base_app_url)

        if contract and contract.get("sample_payload"):
            for k, v in contract["sample_payload"].items():
                sample_val = v
                if isinstance(sample_val, str) and sample_val.startswith("https://app.auromind.ai"):
                    sample_val = sample_val.replace("https://app.auromind.ai", base_app_url)
                sample_ctx[k] = sample_val

        return sample_ctx