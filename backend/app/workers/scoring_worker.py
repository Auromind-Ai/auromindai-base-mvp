import logging
from typing import Any
from datetime import datetime, timezone
import json
from celery import shared_task
import redis
from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.ai_action import Lead
from app.models.conversation import Conversation
from app.utils.intent_detection import detect_intent_signals
from app.services.crm.lead_scoring_service import recalculate_lead_score
from app.services.analytics.realtime_service import publish_to_workspace
from app.core.config import settings
from app.utils.scoring_config import get_scoring_config

logger = logging.getLogger(__name__)

# Initialize synchronous Redis client for the worker
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

@celery_app.task(
    bind=True,
    name="app.workers.scoring_worker.analyze_message_intent",
    max_retries=3,
)
def analyze_message_intent(self, conversation_id: str, message_text: str, message_external_id: str = None):
    cfg = get_scoring_config()
    if not message_text or len(message_text.strip()) < 2:
        return
        
    # Idempotency Check (Fast Dedupe via Redis)
    if message_external_id:
        idempotency_key = f"scoring:processed_msg:{message_external_id}"
        if redis_client.get(idempotency_key):
            logger.info(f"[analyze_message_intent] Duplicate processing prevented for msg: {message_external_id}")
            return
        # Set idempotency key for 24 hours
        redis_client.setex(
            idempotency_key,
            cfg.get_worker_config("idempotency_ttl_seconds"),
            "1"
        )

    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.conversation_id == conversation_id).first()
        if not lead:
            logger.warning(f"[analyze_message_intent] Lead not found for conv {conversation_id}")
            return
            
        result = detect_intent_signals(message_text)
        
        # Store signals & Check Cooldowns
        existing = lead.intent_signals or {}
        merged = {}
        for key, val_obj in result["signals"].items():
            val = val_obj["value"]
            if val and key != "word_count":
                cooldown_key = f"cooldown:lead:{lead.id}:signal:{key}"
                if redis_client.get(cooldown_key):
                    # Signal is still in cooldown, ignore it
                    val = False
                    val_obj["value"] = False
                    val_obj["reasoning"] = ""
                    val_obj["snippet"] = ""
                else:
                    # Apply signal and set 30-min cooldown
                    redis_client.setex(
                        cooldown_key,
                        cfg.get_worker_config("signal_cooldown_seconds"),
                        "1"
                    )
            
            existing_signal = existing.get(key, {})
            if isinstance(existing_signal, bool):
                existing_signal = {"value": existing_signal}
            
            merged_val = existing_signal.get("value", False) or val
            if val:
                merged[key] = val_obj
            else:
                merged[key] = {
                    "value": merged_val,
                    "snippet": existing_signal.get("snippet", ""),
                    "explanation": val_obj.get("explanation", ""),
                    "reasoning": existing_signal.get("reasoning", "")
                }
            
        merged["word_count"] = result["word_count"]
        lead.intent_signals = merged
        
        new_intent_score = result.get("semantic_intent_score", 0)
        lead.semantic_intent_score = max(lead.semantic_intent_score or 0, new_intent_score)
        
        breakdown = recalculate_lead_score(
            lead, db,
            reason="inbound_message_intent",
            commit=False,
        )
        
        # Explicit commit to guarantee single source of truth before realtime publish
        db.commit()
        
        # Realtime pubsub
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            publish_to_workspace(
                workspace_id=str(conv.workspace_id),
                event_type="lead.score.updated",
                payload={
                    "conversation_id": conversation_id,
                    "lead_id": str(lead.id),
                    "score": lead.score,
                    "behavioral_score": lead.behavioral_score,
                    "semantic_intent_score": lead.semantic_intent_score,
                    "lead_tier": lead.lead_tier,
                    "breakdown": breakdown
                },
                conversation_id=conversation_id,
            )
            
    except Exception as exc:
        db.rollback()
        logger.exception(f"[analyze_message_intent] Error: {exc}")
        # If processing failed, remove the idempotency key so it can be retried safely
        if message_external_id:
            redis_client.delete(f"scoring:processed_msg:{message_external_id}")
        raise self.retry(exc=exc, countdown=10)
    finally:
        db.close()


@celery_app.task(
    name="app.workers.scoring_worker.decay_inactive_lead_scores"
)
def decay_inactive_lead_scores():
    db = SessionLocal()
    try:
        leads = db.query(Lead).filter(Lead.status.notin_(["converted", "lost"])).all()
        logger.info(f"[decay_inactive_lead_scores] Recalculating score for {len(leads)} non-terminal leads.")
        for lead in leads:
            try:
                breakdown = recalculate_lead_score(lead, db, reason="recency_decay", commit=False)
                # Realtime pubsub (Task 7)
                publish_to_workspace(
                    workspace_id=str(lead.workspace_id),
                    event_type="lead.score.updated",
                    payload={
                        "type": "lead_score_updated",
                        "conversation_id": str(lead.conversation_id),
                        "lead_id": str(lead.id),
                        "score": lead.score,
                        "behavioral_score": lead.behavioral_score,
                        "semantic_intent_score": lead.semantic_intent_score,
                        "lead_tier": lead.lead_tier,
                        "breakdown": breakdown
                    },
                    conversation_id=str(lead.conversation_id),
                )
            except Exception as e:
                logger.error(f"[decay_inactive_lead_scores] Error recalculating lead {lead.id}: {e}")
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception(f"[decay_inactive_lead_scores] Error running decay task: {exc}")
    finally:
        db.close()

