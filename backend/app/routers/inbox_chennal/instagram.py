import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.security import verify_workspace_access
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.inbox.channel_connection_service import ChannelConnectionService
from app.services.inbox.webhook_service import WebhookService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/instagram", tags=["instagram"])


@router.post("/connect")
def connect_instagram(
    data: dict,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db, data.get("workspace_id"))
    data["workspace_id"] = workspace_id
    return ChannelConnectionService.connect_instagram(db, data)


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


@router.post("/webhook")
async def receive_instagram(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        return await WebhookService.handle_instagram_webhook(data, db)
    except Exception as exc:
        logger.exception("Instagram webhook error: %s", exc)
        return {"status": "error"}