"""Internal WebSocket server for Scrob real-time communication.

MVP: ping-pong keepalive + namespace echo. No real event routing yet.
Becomes a no-op when socket_mode == 'disabled'.
"""

import asyncio
import json
import logging
from typing import Optional

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


async def _handle(websocket, namespace: str):
    async for raw in websocket:
        try:
            msg = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue

        if msg.get("type") == "ping":
            await websocket.send(json.dumps({"type": "pong"}))
            continue

        # Echo back namespaced — placeholder for future event routing
        await websocket.send(json.dumps({"type": "echo", "namespace": namespace, "data": msg}))


async def start_server(port: int, namespace: str = "gwb-scrob"):
    """Start the internal WebSocket server. Returns immediately if disabled."""
    server = await serve(_handle, "0.0.0.0", port, namespace=namespace)
    logger.info("Socket server listening on :%d (namespace=%s)", port, namespace)
    return server


class SocketServer:
    """Lifecycle wrapper for the internal WebSocket server."""

    def __init__(self, port: int = 7332, namespace: str = "gwb-scrob"):
        self.port = port
        self.namespace = namespace
        self._server: Optional[object] = None

    async def start(self):
        self._server = await start_server(self.port, self.namespace)

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None
