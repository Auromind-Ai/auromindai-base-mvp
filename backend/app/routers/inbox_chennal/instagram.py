import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.channel_connection_service import ChannelConnectionService
from app.services.inbox.webhook_service import WebhookService
from app.schemas.webhook import InstagramConnectRequest
from app.services.config_service import config_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/instagram", tags=["instagram"])




@router.post("/connect")
def connect_instagram(
    data: InstagramConnectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, data.workspace_id)
    payload_dict = data.model_dump()
    payload_dict["workspace_id"] = workspace_id
    if not payload_dict.get("code"):
        raise HTTPException(status_code=400, detail="Missing required credential: code is required")
    try:
        return ChannelConnectionService.connect_instagram(db, payload_dict)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Instagram connect error: %s", exc)
        raise HTTPException(status_code=500, detail="Instagram connection operation failed. Please verify credentials.")



from fastapi.responses import PlainTextResponse

@router.get("/webhook")
async def verify_instagram(request: Request):
    from app.services.config_service import config_service
    challenge = WebhookService.verify_meta_subscription(
        request.query_params,
        config_service.get("meta_verify_token"),
    )
    if challenge is not None:
        return PlainTextResponse(str(challenge))
    raise HTTPException(status_code=403, detail="Verification failed")


from starlette.concurrency import run_in_threadpool

@router.post("/webhook")
async def receive_instagram(request: Request, db: Session = Depends(get_db)):
    try:
       
        raw_body = await request.body()
        sig_header = request.headers.get("x-hub-signature-256")
        app_secret = config_service.get("meta_app_secret")
        if app_secret and not WebhookService.verify_meta_signature(raw_body, sig_header, app_secret):
            logger.warning("[INSTAGRAM WEBHOOK] Signature verification failed")
            raise HTTPException(status_code=403, detail="Webhook signature verification failed")

        data = json.loads(raw_body.decode("utf-8") or "{}")
        return await WebhookService.handle_instagram_webhook(data, db)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Instagram webhook error: %s", exc)
        return {"status": "error"}