import asyncio
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

from core.socket import server as socket_server
from core.socket.manager import SocketManager


class FakeWS:
    """Minimal websocket double: async-iterable, records send/close."""

    def __init__(self, path, messages=None):
        self.request = SimpleNamespace(path=path)
        self.sent = []
        self.close_code = None
        self.close_reason = None
        self._messages = list(messages or [])

    async def send(self, data):
        self.sent.append(data)

    async def close(self, code=None, reason=None):
        self.close_code = code
        self.close_reason = reason

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._messages:
            raise StopAsyncIteration
        return self._messages.pop(0)


class SocketManagerInternalTests(unittest.IsolatedAsyncioTestCase):
    async def test_emit_fans_out_to_subscriber(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        await mgr.emit("bob", "list.item_added", {"list_id": 1})
        msg = await asyncio.wait_for(q.get(), timeout=1)
        self.assertEqual(msg["type"], "list.item_added")
        self.assertEqual(msg["channel"], "ns:user-bob")
        self.assertEqual(msg["payload"], {"list_id": 1})
        self.assertIn("timestamp", msg)

    async def test_two_subscribers_both_receive(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        channel = mgr.channel_for("bob")
        q1 = mgr.subscribe(channel)
        q2 = mgr.subscribe(channel)
        await mgr.emit("bob", "x", {})
        m1 = await asyncio.wait_for(q1.get(), timeout=1)
        m2 = await asyncio.wait_for(q2.get(), timeout=1)
        self.assertEqual(m1["channel"], m2["channel"])

    async def test_disabled_delivers_nothing(self):
        mgr = SocketManager()
        mgr._mode = "disabled"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        await mgr.emit("bob", "x", {})
        self.assertTrue(q.empty())

    async def test_channel_naming(self):
        mgr = SocketManager()
        mgr._namespace = "ns"
        self.assertEqual(mgr.channel_for("bob"), "ns:user-bob")
        mgr._namespace = ""
        self.assertEqual(mgr.channel_for("bob"), "user-bob")

    async def test_full_queue_does_not_raise(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        for _ in range(100):
            q.put_nowait({})
        await mgr.emit("bob", "x", {})  # must not raise
        self.assertEqual(q.qsize(), 100)


class SocketServerAuthTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_api_key_closes_4001(self):
        ws = FakeWS("/?foo=1")
        await socket_server._handle(ws)
        self.assertEqual(ws.close_code, 4001)

    async def test_invalid_api_key_closes_4001(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr.get_user_from_api_key = AsyncMock(return_value=None)
        ws = FakeWS("/?apiKey=bad")
        with patch("core.socket.manager.socket_manager", mgr):
            await socket_server._handle(ws)
        self.assertEqual(ws.close_code, 4001)

    async def test_valid_key_ping_pong_and_cleanup(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        mgr.get_user_from_api_key = AsyncMock(
            return_value=SimpleNamespace(username="bob")
        )
        ws = FakeWS("/?apiKey=good", messages=[json.dumps({"type": "ping"})])
        with patch("core.socket.manager.socket_manager", mgr):
            await socket_server._handle(ws)
        types = [json.loads(s).get("type") for s in ws.sent]
        self.assertIn("pong", types)
        self.assertEqual(mgr._subscribers.get("ns:user-bob", set()), set())


if __name__ == "__main__":
    unittest.main()
