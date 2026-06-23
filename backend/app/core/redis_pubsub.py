
import asyncio
import json
import logging
from typing import TYPE_CHECKING, Optional

import redis.asyncio as aioredis

from app.core.config import settings

if TYPE_CHECKING:
    from app.core.websockets import ConnectionManager

logger = logging.getLogger(__name__)

#  Channel helpers

CHANNEL_PREFIX = "auromind"


def user_channel(user_id: str) -> str:
    return f"{CHANNEL_PREFIX}:user:{user_id}"


def workspace_channel(workspace_id: str) -> str:
    return f"{CHANNEL_PREFIX}:workspace:{workspace_id}"


def conversation_channel(conversation_id: str) -> str:
    return f"{CHANNEL_PREFIX}:conv:{conversation_id}"


#  Service

class RedisPubSubService:
   

    def __init__(self, manager: "ConnectionManager") -> None:
        self._manager = manager
        self._redis: Optional[aioredis.Redis] = None
        self._pubsub: Optional[aioredis.client.PubSub] = None
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self._subscribed_channels: set[str] = set()
        self._command_queue: asyncio.Queue = asyncio.Queue()

    #  Lifecycle

    async def start(self) -> None:
      
        self._task = asyncio.create_task(
            self._listen_loop(), name="redis-pubsub-listener"
        )
        logger.info(
            "RedisPubSubService background loop started (will connect to Redis lazily)"
        )

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            try:
                await self._pubsub.unsubscribe()
                await self._pubsub.aclose()
            except Exception:
                pass
        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass
        logger.info("RedisPubSubService stopped")

    #  Channel management ─

    async def subscribe(self, channel: str) -> None:
        if channel in self._subscribed_channels:
            return
        self._subscribed_channels.add(channel)
        await self._command_queue.put(("subscribe", channel))
        logger.debug("Queued subscribe | channel=%s", channel)

    async def unsubscribe(self, channel: str) -> None:
        if channel not in self._subscribed_channels:
            return
        self._subscribed_channels.discard(channel)
        await self._command_queue.put(("unsubscribe", channel))
        logger.debug("Queued unsubscribe | channel=%s", channel)

    #  Internal listener

    async def _listen_loop(self) -> None:
      
        logger.info("Redis Pub/Sub listen loop started")
        reconnect_delay = 1.0

        while not self._stop_event.is_set():
            #  Step 1: connect & subscribe if not already up 
            if self._redis is None:
                try:
                    self._redis = aioredis.from_url(
                        settings.REDIS_URL,
                        encoding="utf-8",
                        decode_responses=True,
                    )
                    self._pubsub = self._redis.pubsub(
                        ignore_subscribe_messages=True
                    )

                    # Hard timeout so a slow/hung Redis never blocks the
                    # loop indefinitely.
                    if self._subscribed_channels:
                        await asyncio.wait_for(
                            self._pubsub.subscribe(*self._subscribed_channels),
                            timeout=5.0,
                        )

                    reconnect_delay = 1.0  # reset back-off on success
                    logger.info(
                        "PubSub connected to Redis | channels=%d",
                        len(self._subscribed_channels),
                    )

                except (asyncio.TimeoutError, Exception) as exc:
                    logger.warning(
                        "PubSub connect/subscribe failed (retry in %.0fs): %s",
                        reconnect_delay,
                        exc,
                    )
                    # Tear down so the next iteration starts fresh.
                    await self._teardown_client()
                    await asyncio.sleep(reconnect_delay)
                    reconnect_delay = min(reconnect_delay * 2, 30.0)
                    continue

            #  Step 2: stream messages 
            # Process any queued subscribe/unsubscribe commands first
            if not self._command_queue.empty():
                try:
                    while not self._command_queue.empty():
                        cmd, chan = self._command_queue.get_nowait()
                        if self._pubsub:
                            if cmd == "subscribe":
                                await self._pubsub.subscribe(chan)
                                logger.debug("PubSub subscribed | channel=%s", chan)
                            elif cmd == "unsubscribe":
                                await self._pubsub.unsubscribe(chan)
                                logger.debug("PubSub unsubscribed | channel=%s", chan)
                        self._command_queue.task_done()
                except Exception as exc:
                    logger.error("Error processing queued PubSub commands: %s", exc)
                    await self._teardown_client()
                    await asyncio.sleep(reconnect_delay)
                    continue

            if not self._subscribed_channels:
                await asyncio.sleep(0.1)
                continue

            try:
                if self._pubsub:
                    message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=0.2)
                    if message:
                        channel: str = message.get("channel", "")
                        raw_data: str = message.get("data", "")
                        if channel and raw_data:
                            await self._dispatch(channel, raw_data)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(
                    "PubSub listen error (retry in %.0fs): %s",
                    reconnect_delay,
                    exc,
                )
                await self._teardown_client()
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, 30.0)

        logger.info("Redis Pub/Sub listen loop exited")

    async def _teardown_client(self) -> None:
        """Close and nullify the Redis client so the next iteration reconnects."""
        if self._pubsub:
            try:
                await self._pubsub.aclose()
            except Exception:
                pass
            self._pubsub = None
        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass
            self._redis = None

    async def _resubscribe_all(self) -> None:
     
        if self._pubsub and self._subscribed_channels:
            channels = list(self._subscribed_channels)
            await asyncio.wait_for(
                self._pubsub.subscribe(*channels),
                timeout=5.0,
            )
            logger.info(
                "PubSub resubscribed to %d channels after reconnect",
                len(channels),
            )

    async def _dispatch(self, channel: str, raw_data: str) -> None:
    
        try:
            payload = json.loads(raw_data)
        except (json.JSONDecodeError, TypeError) as exc:
            logger.warning(
                "PubSub bad JSON | channel=%s | %s", channel, exc
            )
            return

        if channel.startswith(f"{CHANNEL_PREFIX}:user:"):
            user_id = channel.removeprefix(f"{CHANNEL_PREFIX}:user:")
            await self._manager.send_to_user(user_id, payload)

        elif channel.startswith(f"{CHANNEL_PREFIX}:workspace:"):
            workspace_id = channel.removeprefix(f"{CHANNEL_PREFIX}:workspace:")
            await self._manager.send_to_workspace(workspace_id, payload)

        elif channel.startswith(f"{CHANNEL_PREFIX}:conv:"):
            conversation_id = channel.removeprefix(f"{CHANNEL_PREFIX}:conv:")
            user_id = payload.get("user_id")
            workspace_id = payload.get("workspace_id")
            delivered = await self._manager.send_to_conversation(
                conversation_id,
                payload,
                workspace_id=workspace_id,
                user_id=user_id,
            )
            if delivered == 0:
                logger.debug(
                    "PubSub conv event had no websocket subscribers | channel=%s",
                    channel,
                )
        else:
            logger.debug("PubSub unrouted channel: %s", channel)

pubsub_service: Optional[RedisPubSubService] = None
