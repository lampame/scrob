"""Internal WebSocket server for Scrob real-time communication.

Authenticates connections via ?apiKey=, subscribes each connection to the
user's channel on the socket manager, and relays fanned-out events.
Becomes a no-op when socket_mode == 'disabled'.
"""

import asyncio
import json
import logging
from typing import Optional
from urllib.parse import parse_qs, urlparse

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


def _extract_api_key(websocket) -> Optional[str]:
    """Pull ?apiKey= from the handshake request path."""
    request = getattr(websocket, "request", None)
    path = getattr(request, "path", None) or getattr(websocket, "path", "") or ""
    values = parse_qs(urlparse(path).query).get("apiKey")
    return values[0] if values else None


async def _relay(websocket, queue: asyncio.Queue) -> None:
    """Forward queued manager messages to the websocket."""
    try:
        while True:
            message = await queue.get()
            try:
                await websocket.send(json.dumps(message))
            except ConnectionClosed:
                break
    except asyncio.CancelledError:
        pass


async def _handle(websocket):
    # Lazy import: manager imports this module in _start_internal.
    from core.socket.manager import socket_manager

    api_key = _extract_api_key(websocket)
    if not api_key:
        await websocket.close(code=4001, reason="missing apiKey")
        return
    try:
        user = await socket_manager.get_user_from_api_key(api_key)
    except Exception:
        user = None
    if user is None:
        await websocket.close(code=4001, reason="invalid apiKey")
        return

    channel = socket_manager.channel_for(user.username)
    queue = socket_manager.subscribe(channel)
    relay = asyncio.create_task(_relay(websocket, queue))
    try:
        try:
            async for raw in websocket:
                try:
                    msg = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue
                if msg.get("type") == "ping":
                    await websocket.send(json.dumps({"type": "pong"}))
        except ConnectionClosed:
            pass
    finally:
        relay.cancel()
        try:
            await relay
        except (asyncio.CancelledError, ConnectionClosed):
            pass
        socket_manager.unsubscribe(channel, queue)


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
