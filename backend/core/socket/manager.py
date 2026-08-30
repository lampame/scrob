"""Socket Manager for Scrob real-time communication.

Singleton that reads socket settings from GlobalSettings (DB) and can operate
in three modes: 'disabled', 'internal', 'external'.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from db import AsyncSessionLocal
from models.global_settings import GlobalSettings
from models.users import User
from sqlalchemy import select

logger = logging.getLogger(__name__)


class SocketManager:
    """Manages WebSocket connections for real-time event emission."""

    def __init__(self):
        self._mode: str = "disabled"
        self._namespace: str = "gwb-scrob"
        self._join_key: Optional[str] = None
        self._send_key: Optional[str] = None
        self._external_url: str = "wss://itty.ws/c/"
        self._client = None
        self._server = None

    @property
    def mode(self) -> str:
        return self._mode

    @property
    def is_enabled(self) -> bool:
        return self._mode != "disabled"

    async def startup(self, app=None):
        """Initialize on app startup, read settings from DB."""
        from routers.media import _get_global_settings

        async with AsyncSessionLocal() as db:
            gs = await _get_global_settings(db)
            if gs:
                self._mode = gs.socket_mode or "disabled"
                self._namespace = gs.socket_namespace or ""
                self._join_key = gs.socket_join_key
                self._send_key = gs.socket_send_key
                self._external_url = gs.socket_external_url or "wss://itty.ws/c/"

        logger.info("Socket Manager initialized: mode=%s, namespace=%s", self._mode, self._namespace)

        if self._mode == "external":
            await self._start_external()
        elif self._mode == "internal":
            await self._start_internal()

    async def shutdown(self):
        """Cleanup connections."""
        if self._client:
            await self._client.disconnect()
            self._client = None
        if self._server:
            await self._server.stop()
            self._server = None
        logger.info("Socket Manager shut down")

    async def _start_external(self):
        """Connect to itty.ws as a client."""
        from core.socket.client import SocketClient

        self._client = SocketClient(
            url=self._external_url,
            namespace=self._namespace,
            join_key=self._join_key,
            send_key=self._send_key,
        )
        try:
            await self._client.connect()
            logger.info("External socket client connected to %s", self._external_url)
        except Exception as e:
            logger.warning("Failed to connect external socket client: %s", e)
            self._client = None

    async def _start_internal(self):
        """Start internal WebSocket server."""
        from core.socket.server import SocketServer

        self._server = SocketServer(port=7332, namespace=self._namespace)
        await self._server.start()
        logger.info("Internal socket server started on :7332")

    async def emit(self, username: str, event_type: str, payload: dict):
        """Emit event to user's channel."""
        if not self.is_enabled or not self._client:
            return

        # Build channel name: "namespace:user-username" or just "user-username" if no namespace
        if self._namespace:
            channel = f"{self._namespace}:user-{username}"
        else:
            channel = f"user-{username}"
        message = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "channel": channel,
        }
        try:
            await self._client.send(message)
        except Exception as e:
            logger.error("Failed to emit event to %s: %s", channel, e)

    async def get_user_from_api_key(self, api_key: str) -> Optional[User]:
        """Resolve user from API key."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.api_key == api_key))
            return result.scalar_one_or_none()


# Singleton instance
socket_manager = SocketManager()
