"""External WebSocket client for connecting to wss://itty.ws/c/.

MVP: connect/disconnect/send/onMessage + ping-pong keepalive.
"""

import asyncio
import json
import logging
from typing import Callable, Optional
from urllib.parse import urlencode

from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


class SocketClient:
    """Async WebSocket client for an external relay (e.g. itty.ws)."""

    def __init__(
        self,
        url: str = "wss://itty.ws/c/",
        namespace: str = "gwb-scrob",
        join_key: Optional[str] = None,
        send_key: Optional[str] = None,
    ):
        self.url = url
        self.namespace = namespace
        self.join_key = join_key
        self.send_key = send_key
        self._ws = None
        self._listener: Optional[asyncio.Task] = None
        self._on_message: Optional[Callable] = None

    def _build_url(self) -> str:
        # itty.ws URL format: wss://itty.ws/c/{namespace}?joinKey=...&sendKey=...
        base = self.url.rstrip("/")
        path = f"{base}/{self.namespace}"
        params = {}
        if self.join_key:
            params["joinKey"] = self.join_key
        if self.send_key:
            params["sendKey"] = self.send_key
        if params:
            return f"{path}?{urlencode(params)}"
        return path

    async def connect(self):
        url = self._build_url()
        self._ws = await connect(url)
        self._listener = asyncio.create_task(self._listen())
        logger.info("Socket client connected to %s (namespace=%s)", self.url, self.namespace)

    async def disconnect(self):
        if self._listener:
            self._listener.cancel()
            self._listener = None
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def send(self, data: dict):
        if not self._ws:
            raise RuntimeError("not connected")
        await self._ws.send(json.dumps(data))

    def on_message(self, callback: Callable):
        self._on_message = callback

    async def _listen(self):
        try:
            async for raw in self._ws:
                try:
                    msg = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue

                if msg.get("type") == "ping":
                    await self.send({"type": "pong"})
                    continue

                if self._on_message:
                    result = self._on_message(msg)
                    if asyncio.iscoroutine(result):
                        await result
        except (ConnectionClosed, asyncio.CancelledError):
            pass
