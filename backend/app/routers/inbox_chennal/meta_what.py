import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.services.channel_connection_service import ChannelConnectionService
from app.services.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/whatsapp/connect")
async def connect_whatsapp(data: dict, db: Session = Depends(get_db)):
    try:
        return ChannelConnectionService.connect_meta_whatsapp(db, data)
    except Exception as exc:
        logger.error("WhatsApp connect error: %s", exc)
        raise HTTPException(status_code=500, detail="WhatsApp connection failed")


@router.get("/whatsapp/webhook")
async def verify_webhook(request: Request):
    return WebhookService.verify_meta_subscription(
        request.query_params,
        settings.META_VERIFY_TOKEN,
    )


@router.post("/whatsapp/webhook")
async def receive_whatsapp(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        return await WebhookService.handle_meta_whatsapp_webhook(data, db)
    except Exception as exc:
        logger.error("Webhook error: %s", exc)
        return {"status": "error"}
