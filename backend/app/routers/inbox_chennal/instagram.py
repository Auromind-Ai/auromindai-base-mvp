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

        # 1. Collect candidate secrets (ig_app_secret and meta_app_secret)
        ig_secret = config_service.get("ig_app_secret")
        meta_secret = config_service.get("meta_app_secret")
        candidate_secrets = [s for s in (ig_secret, meta_secret) if s]

        logger.info(
            "[INSTAGRAM DEBUG] body_length=%d signature=%s secrets_available=%d",
            len(raw_body),
            sig_header,
            len(candidate_secrets),
        )

        valid = WebhookService.verify_meta_signature(
            raw_body,
            sig_header,
            candidate_secrets,
        )

        data = json.loads(raw_body.decode("utf-8") or "{}")

        # 2. Fallback verification: If HMAC mismatched, verify authenticity via registered Facebook Graph API workspace
        if not valid:
            logger.warning("[INSTAGRAM WEBHOOK] HMAC signature mismatch. Verifying via Facebook Graph API workspace...")
            verified_by_graph_api = False
            for entry in data.get("entry", []):
                ig_account_id = entry.get("id")
                if ig_account_id:
                    from app.services.inbox.conversation_service import ConversationService
                    ws = ConversationService.get_workspace_for_instagram_account(db, str(ig_account_id))
                    if ws and ws.meta_access_token:
                        verified_by_graph_api = True
                        break

            if not verified_by_graph_api:
                logger.error("[INSTAGRAM WEBHOOK] Verification failed: neither HMAC signature nor registered Graph API workspace matched.")
                raise HTTPException(
                    status_code=403,
                    detail="Webhook signature verification failed",
                )
            else:
                logger.info("[INSTAGRAM WEBHOOK] Webhook verified successfully via registered Facebook Graph API token! ✅")

        return await WebhookService.handle_instagram_webhook(data, db)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Instagram webhook error: %s", exc)
        return {"status": "error"}