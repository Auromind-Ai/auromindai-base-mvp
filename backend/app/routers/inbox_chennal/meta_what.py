import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.channel_connection_service import ChannelConnectionService
from app.services.inbox.webhook_service import WebhookService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/whatsapp/connect")
async def connect_whatsapp(
    data: dict,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, data.get("workspace_id"))
    data["workspace_id"] = workspace_id
    try:
        return ChannelConnectionService.connect_meta_whatsapp(db, data)
    except HTTPException as e:
        logger.exception("WhatsApp connect failed")
        logger.error(f"WhatsApp connect error: {e.detail}")
        raise
    except Exception as exc:
        logger.error("WhatsApp connect error: %s", exc)
        raise HTTPException(status_code=500, detail=f"WhatsApp connection failed: {str(exc)}")


from fastapi.responses import PlainTextResponse

@router.get("/whatsapp/webhook")
async def verify_webhook(request: Request):
    logger.info("=== META WHATSAPP WEBHOOK VERIFICATION REQUEST ===")
    logger.info(f"Query Params: {request.query_params}")
    from app.services.config_service import config_service
    challenge = WebhookService.verify_meta_subscription(
        request.query_params,
        config_service.get("meta_verify_token"),
    )
    if challenge is not None:
        return PlainTextResponse(str(challenge))
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp/webhook")
async def receive_whatsapp(request: Request, db: Session = Depends(get_db)):
    logger.info("=== INCOMING META WHATSAPP WEBHOOK ===")
    try:
        data = await request.json()
        logger.info(f"Raw Webhook Payload: {data}")
        return await WebhookService.handle_meta_whatsapp_webhook(data, db)
    except Exception as exc:
        logger.exception(f"Webhook processing error: {exc}")
        return {"status": "error"}


@router.get("/channels/status")
async def get_channels_status(workspace_id: str, db: Session = Depends(get_db)):
    try:
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        return {
            "whatsapp": {
                "connected": bool(workspace.meta_access_token and workspace.meta_phone_number_id),
                "phone": workspace.meta_display_phone or ("Connected" if workspace.meta_phone_number_id else None)
            },
            "instagram": {
                "connected": bool(workspace.meta_ig_id),
                "username": workspace.meta_ig_id
            },
            "twilio": {
                "connected": bool(workspace.twilio_account_sid and workspace.twilio_phone_number),
                "phone": workspace.twilio_phone_number
            }
        }
    except Exception as exc:
        logger.error("Error getting channels status: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/channels/disconnect/{channel_type}")
async def disconnect_channel(
    channel_type: str,
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    verify_workspace_access(current_user, db, workspace_id)
    from app.models.workspace import Workspace
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if channel_type == "whatsapp":
        workspace.meta_access_token = None
        workspace.meta_business_id = None
        workspace.meta_waba_id = None
        workspace.meta_phone_number_id = None
        workspace.meta_display_phone = None
    elif channel_type == "instagram":
        workspace.meta_ig_id = None
        workspace.meta_access_token = None
        workspace.meta_business_id = None
    elif channel_type == "twilio":
        workspace.twilio_account_sid = None
        workspace.twilio_auth_token = None
        workspace.twilio_phone_number = None
    else:
        raise HTTPException(status_code=400, detail="Invalid channel type")
        
    db.commit()
    return {"status": "success", "message": f"Disconnected {channel_type}"}

