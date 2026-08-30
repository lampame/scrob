"""Internal WebSocket server for Scrob real-time communication.

MVP: ping-pong keepalive + echo. No real event routing yet.
Becomes a no-op when socket_mode == 'disabled'.
"""

import json
import logging
from typing import Optional

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


async def _handle(websocket):
    async for raw in websocket:
        try:
            msg = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue

        if msg.get("type") == "ping":
            await websocket.send(json.dumps({"type": "pong"}))
            continue

        # Echo back — placeholder for future event routing
        await websocket.send(json.dumps({"type": "echo", "data": msg}))


async def start_server(port: int):
    """Start the internal WebSocket server."""
    server = await serve(_handle, "0.0.0.0", port)
    logger.info("Socket server listening on :%d", port)
    return server


class SocketServer:
    """Lifecycle wrapper for the internal WebSocket server."""

    def __init__(self, port: int = 7332, namespace: str = ""):
        self.port = port
        self.namespace = namespace  # Reserved for future use
        self._server: Optional[object] = None

    async def start(self):
        self._server = await start_server(self.port)

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None
