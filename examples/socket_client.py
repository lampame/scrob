"""Reusable WebSocket client for the Scrob real-time API.

Connects to wss://itty.ws/c/ (external mode) and listens for events
or sends events to the backend.

Usage:
    python examples/socket_client.py
"""

import asyncio
import json
import logging
from typing import Callable, Optional

from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


class ScrobSocketClient:
    """Async WebSocket client for Scrob real-time events."""

    def __init__(
        self,
        username: str,
        api_key: str,
        url: str = "wss://itty.ws/c/",
        namespace: str = "gwb-scrob",
        auto_reconnect: bool = True,
        max_backoff: float = 30.0,
    ):
        self.username = username
        self.api_key = api_key
        self.url = url
        self.namespace = namespace
        self.auto_reconnect = auto_reconnect
        self.max_backoff = max_backoff

        self._ws = None
        self._listener: Optional[asyncio.Task] = None
        self._on_message: Optional[Callable] = None
        self._on_connect: Optional[Callable] = None
        self._on_disconnect: Optional[Callable] = None
        self._backoff: float = 1.0

    def _build_url(self) -> str:
        channel = f"user-{self.username}"
        return f"{self.url}{namespace}:{channel}?apiKey={self.api_key}"

    async def connect(self):
        """Connect to the WebSocket server."""
        url = self._build_url()
        self._ws = await connect(url)
        self._backoff = 1.0
        logger.info("Connected to %s", url)
        if self._on_connect:
            result = self._on_connect()
            if asyncio.iscoroutine(result):
                await result
        self._listener = asyncio.create_task(self._listen())

    async def disconnect(self):
        """Disconnect and cleanup."""
        if self._listener:
            self._listener.cancel()
            self._listener = None
        if self._ws:
            await self._ws.close()
            self._ws = None
        logger.info("Disconnected")

    async def send(self, event_type: str, payload: dict):
        """Send an event to the backend."""
        if not self._ws:
            raise RuntimeError("not connected — call connect() first")
        msg = {
            "type": event_type,
            "payload": payload,
        }
        await self._ws.send(json.dumps(msg))
        logger.debug("Sent: %s", event_type)

    async def listen(self, callback: Callable):
        """Listen for events. Blocks until disconnect."""
        self._on_message = callback
        try:
            await self._listener
        except asyncio.CancelledError:
            pass

    def on_connect(self, callback: Callable):
        """Set callback for connection established."""
        self._on_connect = callback

    def on_disconnect(self, callback: Callable):
        """Set callback for disconnection."""
        self._on_disconnect = callback

    async def _listen(self):
        """Internal listener with auto-reconnect."""
        while True:
            try:
                async for raw in self._ws:
                    try:
                        msg = json.loads(raw)
                    except (json.JSONDecodeError, TypeError):
                        continue

                    # Handle ping-pong keepalive
                    if msg.get("type") == "ping":
                        await self._ws.send(json.dumps({"type": "pong"}))
                        continue

                    if self._on_message:
                        result = self._on_message(msg)
                        if asyncio.iscoroutine(result):
                            await result

            except (ConnectionClosed, OSError) as e:
                logger.warning("Connection closed: %s", e)
                if self._on_disconnect:
                    result = self._on_disconnect()
                    if asyncio.iscoroutine(result):
                        await result

                if not self.auto_reconnect:
                    break

                logger.info("Reconnecting in %.1fs...", self._backoff)
                await asyncio.sleep(self._backoff)
                self._backoff = min(self._backoff * 2, self.max_backoff)

                try:
                    await self.connect()
                except Exception as e:
                    logger.error("Reconnect failed: %s", e)
                    continue
            else:
                break


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Replace with your credentials
    USERNAME = "your-username"
    API_KEY = "your-api-key"

    async def main():
        client = ScrobSocketClient(
            username=USERNAME,
            api_key=API_KEY,
        )

        def on_event(msg):
            event_type = msg.get("type", "unknown")
            payload = msg.get("payload", {})
            print(f"[{event_type}] {json.dumps(payload, indent=2)}")

        def on_connect():
            print("Connected to Scrob WebSocket")

        def on_disconnect():
            print("Disconnected — will auto-reconnect...")

        client.on_connect(on_connect)
        client.on_disconnect(on_disconnect)

        await client.connect()
        await client.listen(on_event)

    asyncio.run(main())
