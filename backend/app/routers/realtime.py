
import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.websockets import manager
import app.core.redis_pubsub as redis_pubsub
from app.core.redis_pubsub import (
    user_channel,
    workspace_channel,
    conversation_channel,
)
from app.database import SessionLocal
from app.models.conversation import Conversation
from app.utils.auth import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["realtime"])

_HEARTBEAT_INTERVAL = 30  
_RECV_TIMEOUT       = 70  


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str | None = Query(None, description="JWT access token"),
    workspace_id: str | None = Query(None, description="Active workspace ID"),
):
    # 1. Authenticate
    actual_token = token
    if not actual_token:
        actual_token = (
            websocket.cookies.get("auth_token")
            or websocket.cookies.get("access_token")
            or websocket.cookies.get("token")
        )

    if not actual_token:
        # Check raw Cookie header if cookies dict is empty
        cookie_header = websocket.headers.get("cookie", "")
        import http.cookies
        try:
            simple_cookie = http.cookies.SimpleCookie(cookie_header)
            for c_key in ("auth_token", "access_token", "token"):
                if c_key in simple_cookie:
                    actual_token = simple_cookie[c_key].value
                    break
        except Exception:
            pass

    payload = decode_access_token(actual_token) if actual_token else None
    if payload is None:
        logger.error(f"WebSocket auth error for user {user_id}: payload is None")
        await websocket.close(code=4001, reason="Unauthorized")
        return

    token_user_id: str = payload.get("sub", "")
    if token_user_id != user_id:
        logger.error(f"WebSocket auth error: token subject ({token_user_id}) mismatch for user {user_id}")
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # Find user's workspace(s)
    resolved_workspace_id: str | None = workspace_id or payload.get("workspace_id")
    user_workspaces: list[str] = []
    db = SessionLocal()
    try:
        from app.models.workspace import WorkspaceMember
        memberships = (
            db.query(WorkspaceMember.workspace_id)
            .filter(WorkspaceMember.user_id == token_user_id)
            .all()
        )
        user_workspaces = [str(m[0]) for m in memberships if m[0]]
        if not resolved_workspace_id and user_workspaces:
            resolved_workspace_id = user_workspaces[0]
    except Exception as ws_err:
        logger.warning(f"WebSocket workspace lookup error: {ws_err}")
    finally:
        db.close()

    if not resolved_workspace_id and not user_workspaces:
        logger.error(f"WebSocket auth error: Workspace context missing for user {user_id}")
        await websocket.close(code=4001, reason="Workspace missing")
        return

    primary_ws = resolved_workspace_id or (user_workspaces[0] if user_workspaces else "")

    # 2. Register connection
    await manager.connect(user_id, websocket, workspace_id=primary_ws)

    # 3. Subscribe to Redis channels for user and all their active workspaces
    user_redis_channel = user_channel(user_id)
    pubsub_service = redis_pubsub.pubsub_service
    if pubsub_service:
        await pubsub_service.subscribe(user_redis_channel)
        if primary_ws:
            await pubsub_service.subscribe(workspace_channel(primary_ws))
        for ws_item in user_workspaces:
            if ws_item != primary_ws:
                await pubsub_service.subscribe(workspace_channel(ws_item))

    # 4. Confirm connection to client
    await websocket.send_json({
        "event_type": "connection_established",
        "payload": {
            "user_id": user_id,
            "workspace_id": primary_ws,
            "workspaces": user_workspaces,
        },
    })

    #  5. Start heartbeat 
    heartbeat = asyncio.create_task(
        _heartbeat_loop(websocket, user_id),
        name=f"hb-{user_id}",
    )

    try:
        #  6. Receive loop ─
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=_RECV_TIMEOUT,
                )
                await _handle_client_message(
                    user_id=user_id,
                    workspace_id=workspace_id,
                    websocket=websocket,
                    data=data,
                )
            except asyncio.TimeoutError:
                continue

    except WebSocketDisconnect as exc:
        logger.info("WebSocket disconnect | user=%s code=%s", user_id, exc.code)
    except Exception as exc:
        logger.warning("WebSocket error | user=%s | %s", user_id, exc)
    finally:
        #  7. Cleanup
        heartbeat.cancel()
        removed_conversations = manager.disconnect(user_id, websocket)

      
        if not manager.is_user_connected(user_id) and pubsub_service:
            await pubsub_service.unsubscribe(user_redis_channel)
        if (
            workspace_id
            and not manager.is_workspace_connected(workspace_id)
            and pubsub_service
            and workspace_redis_channel
        ):
            await pubsub_service.unsubscribe(workspace_redis_channel)
        if pubsub_service:
            for conv_id in removed_conversations:
                if not manager.is_conversation_subscribed(conv_id):
                    await pubsub_service.unsubscribe(conversation_channel(conv_id))

        logger.info("WebSocket cleanup done | user=%s", user_id)


async def _heartbeat_loop(websocket: WebSocket, user_id: str) -> None:
    """Send server→client ping every 30 s to detect dead connections."""
    while True:
        try:
            await asyncio.sleep(_HEARTBEAT_INTERVAL)
            await websocket.send_json({"event_type": "ping"})
        except asyncio.CancelledError:
            break
        except Exception:
            break  # Socket is dead; the main loop will handle cleanup


async def _handle_client_message(
    user_id: str,
    workspace_id: str,
    websocket: WebSocket,
    data: dict,
) -> None:
    """Handle messages FROM the browser (pong, subscribe_conversation, etc.)."""
    msg_type = data.get("type")
    pubsub_service = redis_pubsub.pubsub_service

    if msg_type == "pong":
        logger.debug("pong | user=%s", user_id)

    elif msg_type == "subscribe_conversation":
        conv_id = data.get("conversation_id")
        if conv_id and pubsub_service:
            if not _conversation_belongs_to_workspace(workspace_id=workspace_id, conversation_id=conv_id):
                await websocket.send_json(
                    {
                        "event_type": "subscription_denied",
                        "payload": {"conversation_id": conv_id},
                    }
                )
                logger.warning(
                    "Denied websocket conversation subscription | user=%s workspace=%s conv=%s",
                    user_id,
                    workspace_id,
                    conv_id,
                )
                return
            manager.subscribe_conversation(user_id, websocket, conv_id)
            await pubsub_service.subscribe(conversation_channel(conv_id))
            logger.info(
                "Client subscribed to conversation channel | user=%s conv=%s",
                user_id,
                conv_id,
            )
    elif msg_type == "unsubscribe_conversation":
        conv_id = data.get("conversation_id")
        if conv_id:
            manager.unsubscribe_conversation(user_id, websocket, conv_id)
            if (
                pubsub_service
                and not manager.is_conversation_subscribed(conv_id)
            ):
                await pubsub_service.unsubscribe(conversation_channel(conv_id))
            logger.info(
                "Client unsubscribed from conversation channel | user=%s conv=%s",
                user_id,
                conv_id,
            )
    else:
        logger.debug("Unknown client msg type=%s | user=%s", msg_type, user_id)


def _conversation_belongs_to_workspace(*, workspace_id: str, conversation_id: str) -> bool:
    from app.core.security import to_uuid
    ws_uuid = to_uuid(workspace_id)
    conv_uuid = to_uuid(conversation_id)
    if not ws_uuid or not conv_uuid:
        return False
    db = SessionLocal()
    try:
        conversation = (
            db.query(Conversation.id)
            .filter(
                Conversation.id == conv_uuid,
                Conversation.workspace_id == ws_uuid,
            )
            .first()
        )
        return conversation is not None
    finally:
        db.close()
