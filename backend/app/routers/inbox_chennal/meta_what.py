import logging
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.channel_connection_service import ChannelConnectionService
from app.services.inbox.webhook_service import WebhookService
from app.schemas.webhook import MetaWhatsAppConnectRequest
from app.services.config_service import config_service

from app.core.logger import logger
router = APIRouter()




@router.post("/whatsapp/connect")
async def connect_whatsapp(
    data: MetaWhatsAppConnectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, data.workspace_id)
    payload_dict = data.model_dump()
    payload_dict["workspace_id"] = workspace_id
    if not payload_dict.get("code") and not payload_dict.get("fb_access_token"):
        raise HTTPException(status_code=400, detail="Missing required credentials: code or fb_access_token is required")
    try:
        return ChannelConnectionService.connect_meta_whatsapp(db, payload_dict)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("WhatsApp connect error: %s", exc)
        raise HTTPException(status_code=500, detail="WhatsApp connection operation failed. Please verify credentials.")



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


from starlette.concurrency import run_in_threadpool

@router.post("/whatsapp/webhook")
async def receive_whatsapp(request: Request, db: Session = Depends(get_db)):
    logger.debug("=== INCOMING META WHATSAPP WEBHOOK POST REQUEST ===")
    logger.info("=== INCOMING META WHATSAPP WEBHOOK ===")
    try:
    
        raw_body = await request.body()
        sig_header = request.headers.get("x-hub-signature-256")
        meta_secret = config_service.get("meta_app_secret")
        ig_secret = config_service.get("ig_app_secret")
        candidate_secrets = [s for s in [meta_secret, ig_secret] if s]
        if candidate_secrets and not WebhookService.verify_meta_signature(raw_body, sig_header, candidate_secrets):
            logger.warning("[META WEBHOOK] Signature verification failed")
            raise HTTPException(status_code=403, detail="Webhook signature verification failed")

        data = json.loads(raw_body.decode("utf-8") or "{}")
        logger.debug(f"Raw Payload: {json.dumps(data)}")
        logger.info(f"Raw Webhook Payload: {data}")
        res = await WebhookService.handle_meta_whatsapp_webhook(data, db)
        logger.debug(f"Result from WebhookService: {res}")
        return res
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Webhook processing error: {exc}")
        logger.exception(f"Webhook processing error traceback: {exc}")
        return {"status": "error"}




@router.get("/channels/status")
async def get_channels_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id)
    from app.core.security import to_uuid
    ws_uuid = to_uuid(workspace_id)
    try:
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        return {
            "whatsapp": {
                "connected": bool(workspace.meta_access_token and workspace.meta_phone_number_id),
                "phone": workspace.meta_display_phone or ("Connected" if workspace.meta_phone_number_id else None),
                "phone_number_id": workspace.meta_phone_number_id,
                "waba_id": workspace.meta_waba_id
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
    from app.core.security import to_uuid
    ws_uuid = to_uuid(workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)
    from app.models.workspace import Workspace
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
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
        workspace.twilio_messaging_service_sid = None
    else:
        raise HTTPException(status_code=400, detail="Invalid channel type")
        
    db.commit()
    return {"status": "success", "message": f"Disconnected {channel_type}"}

