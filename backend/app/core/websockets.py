
import asyncio
import logging
from typing import Dict, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_SEND_TIMEOUT_SECONDS = 5


class ConnectionManager:

    def __init__(self) -> None:
       
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.workspace_connections: Dict[str, List[WebSocket]] = {}
        self.conversation_connections: Dict[str, List[WebSocket]] = {}
        self._connection_context: Dict[int, dict] = {}
        self._total_connected: int = 0

    async def connect(
        self,
        user_id: str,
        websocket: WebSocket,
        workspace_id: Optional[str] = None,
    ) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

        if workspace_id:
            if workspace_id not in self.workspace_connections:
                self.workspace_connections[workspace_id] = []
            self.workspace_connections[workspace_id].append(websocket)

        self._connection_context[id(websocket)] = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "conversations": set(),
        }
        self._total_connected += 1
        logger.info(
            "WebSocket connected | user=%s workspace=%s total=%d",
            user_id,
            workspace_id,
            self._total_connected,
        )

    def disconnect(self, user_id: str, websocket: WebSocket) -> Set[str]:
        removed_conversations: Set[str] = set()

        connections = self.active_connections.get(user_id, [])
        try:
            connections.remove(websocket)
        except ValueError:
            pass
        if not connections:
            self.active_connections.pop(user_id, None)

        context = self._connection_context.pop(id(websocket), {})
        workspace_id = context.get("workspace_id")
        if workspace_id:
            workspace_connections = self.workspace_connections.get(workspace_id, [])
            try:
                workspace_connections.remove(websocket)
            except ValueError:
                pass
            if not workspace_connections:
                self.workspace_connections.pop(workspace_id, None)

        for conversation_id in context.get("conversations", set()):
            removed_conversations.add(conversation_id)
            conv_connections = self.conversation_connections.get(conversation_id, [])
            try:
                conv_connections.remove(websocket)
            except ValueError:
                pass
            if not conv_connections:
                self.conversation_connections.pop(conversation_id, None)

        self._total_connected = max(0, self._total_connected - 1)
        logger.info(
            "WebSocket disconnected | user=%s remaining=%d total=%d",
            user_id,
            len(connections),
            self._total_connected,
        )
        return removed_conversations

    def is_user_connected(self, user_id: str) -> bool:
        return bool(self.active_connections.get(user_id))

    def is_workspace_connected(self, workspace_id: str) -> bool:
        return bool(self.workspace_connections.get(workspace_id))

    def is_conversation_subscribed(self, conversation_id: str) -> bool:
        return bool(self.conversation_connections.get(conversation_id))

    def connected_user_ids(self) -> List[str]:
        return list(self.active_connections.keys())

    def subscribe_conversation(
        self,
        user_id: str,
        websocket: WebSocket,
        conversation_id: str,
    ) -> None:
        if conversation_id not in self.conversation_connections:
            self.conversation_connections[conversation_id] = []
        if websocket not in self.conversation_connections[conversation_id]:
            self.conversation_connections[conversation_id].append(websocket)

        context = self._connection_context.get(id(websocket))
        if context is not None:
            context.setdefault("conversations", set()).add(conversation_id)

        logger.info(
            "WebSocket conversation subscribed | user=%s conversation=%s",
            user_id,
            conversation_id,
        )

    def unsubscribe_conversation(
        self,
        user_id: str,
        websocket: WebSocket,
        conversation_id: str,
    ) -> None:
        conv_connections = self.conversation_connections.get(conversation_id, [])
        try:
            conv_connections.remove(websocket)
        except ValueError:
            pass
        if not conv_connections:
            self.conversation_connections.pop(conversation_id, None)

        context = self._connection_context.get(id(websocket))
        if context is not None:
            context.setdefault("conversations", set()).discard(conversation_id)

        logger.info(
            "WebSocket conversation unsubscribed | user=%s conversation=%s",
            user_id,
            conversation_id,
        )

    async def _send_to_connections(
        self,
        connections: List[WebSocket],
        message: dict,
    ) -> int:
        dead: List[WebSocket] = []
        delivered = 0

        seen: Set[int] = set()
        for ws in list(connections):
            if id(ws) in seen:
                continue
            seen.add(id(ws))
            try:
                await asyncio.wait_for(
                    ws.send_json(message),
                    timeout=_SEND_TIMEOUT_SECONDS,
                )
                delivered += 1
            except asyncio.TimeoutError:
                logger.warning("WebSocket send timeout")
                dead.append(ws)
            except Exception as exc:
                logger.warning("WebSocket send error | %s", exc)
                dead.append(ws)

        for ws in dead:
            context = self._connection_context.get(id(ws), {})
            dead_user_id = context.get("user_id")
            if dead_user_id:
                self.disconnect(dead_user_id, ws)

        return delivered

    async def send_to_user(self, user_id: str, message: dict) -> int:
        connections = self.active_connections.get(user_id, [])
        if not connections:
            return 0

        return await self._send_to_connections(connections, message)

    async def send_to_workspace(self, workspace_id: str, message: dict) -> int:
        connections = self.workspace_connections.get(workspace_id, [])
        if not connections:
            return 0

        return await self._send_to_connections(connections, message)

    async def send_to_conversation(
        self,
        conversation_id: str,
        message: dict,
        workspace_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> int:
        connections = self.conversation_connections.get(conversation_id, [])
        scoped_connections: List[WebSocket] = []
        for ws in connections:
            context = self._connection_context.get(id(ws), {})
            if workspace_id and context.get("workspace_id") != workspace_id:
                continue
            if user_id and context.get("user_id") != user_id:
                continue
            scoped_connections.append(ws)

        return await self._send_to_connections(scoped_connections, message)

    async def broadcast(self, message: dict) -> None:
        for user_id in self.connected_user_ids():
            await self.send_to_user(user_id, message)

    @property
    def stats(self) -> dict:
        return {
            "total_connected": self._total_connected,
            "connected_users": len(self.active_connections),
            "connected_workspaces": len(self.workspace_connections),
            "subscribed_conversations": len(self.conversation_connections),
        }

manager = ConnectionManager()
