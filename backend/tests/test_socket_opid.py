import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

from core.socket.manager import SocketManager
from models.base import MediaType
from routers import socket as socket_router


class _R:
    def __init__(self, scalar=None):
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar


def _db(*results):
    return SimpleNamespace(
        execute=AsyncMock(side_effect=list(results)),
        commit=AsyncMock(),
        flush=AsyncMock(),
        add=MagicMock(),
        delete=AsyncMock(),
    )


def _user():
    return SimpleNamespace(id=7, username="tester")


class EmitOpIdTests(unittest.IsolatedAsyncioTestCase):
    async def test_emit_includes_op_id_top_level_and_payload(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        orig = {"list_id": 1}
        await mgr.emit("bob", "list.item_added", orig, op_id="op-1")
        msg = await asyncio.wait_for(q.get(), timeout=1)
        self.assertEqual(msg["op_id"], "op-1")
        self.assertEqual(msg["payload"]["op_id"], "op-1")
        self.assertEqual(orig, {"list_id": 1})  # caller dict not mutated

    async def test_emit_external_send_carries_op_id(self):
        mgr = SocketManager()
        mgr._mode = "external"
        mgr._client = SimpleNamespace(send=AsyncMock())
        await mgr.emit("bob", "list.item_added", {"list_id": 1}, op_id="op-2")
        sent = mgr._client.send.await_args.args[0]
        self.assertEqual(sent["op_id"], "op-2")
        self.assertEqual(sent["payload"]["op_id"], "op-2")

    async def test_emit_overlong_op_id_ignored(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        await mgr.emit("bob", "x", {"a": 1}, op_id="z" * 65)
        msg = await asyncio.wait_for(q.get(), timeout=1)
        self.assertNotIn("op_id", msg)
        self.assertNotIn("op_id", msg["payload"])

    async def test_emit_non_str_op_id_ignored(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        await mgr.emit("bob", "x", {"a": 1}, op_id=123)
        msg = await asyncio.wait_for(q.get(), timeout=1)
        self.assertNotIn("op_id", msg)
        self.assertNotIn("op_id", msg["payload"])

    async def test_emit_no_op_id_no_keys(self):
        mgr = SocketManager()
        mgr._mode = "internal"
        mgr._namespace = "ns"
        q = mgr.subscribe(mgr.channel_for("bob"))
        await mgr.emit("bob", "x", {"a": 1})
        msg = await asyncio.wait_for(q.get(), timeout=1)
        self.assertNotIn("op_id", msg)
        self.assertNotIn("op_id", msg["payload"])


class HandleListEventOpIdTests(unittest.IsolatedAsyncioTestCase):
    async def _run_handler(self, op_id):
        lst = SimpleNamespace(id=1, name="Watchlist")
        media = SimpleNamespace(id=42, tmdb_id=100, media_type=MediaType.movie, title="Dune")
        item = SimpleNamespace(id=9, media_id=42)
        db = _db(
            _R(scalar=lst),  # list lookup
            _R(scalar=None),  # duplicate check (add path needs _resolve_list_media only for tmdb; use media_id)
            _R(scalar=media),  # media fetch for broadcast
        )
        with patch("core.socket.manager.socket_manager.emit", new=AsyncMock()) as emit:
            result = await socket_router._handle_list_event(
                _user(), "list.item_added", {"list_id": 1, "media_id": 42}, db, op_id=op_id
            )
        return result, emit

    async def test_handler_forwards_op_id_to_broadcast(self):
        result, emit = await self._run_handler("op-9")
        self.assertEqual(emit.await_args.kwargs.get("op_id"), "op-9")
        self.assertEqual(result.get("op_id"), "op-9")

    async def test_handler_without_op_id(self):
        result, emit = await self._run_handler(None)
        self.assertIsNone(emit.await_args.kwargs.get("op_id"))
        self.assertNotIn("op_id", result)

    async def test_receive_event_resolves_op_id_from_request_field(self):
        event = socket_router.SocketEventRequest(type="list.item_added", payload={"list_id": 1}, op_id="op-req")
        with patch.dict(socket_router._EVENT_HANDLERS, {"list.item_added": AsyncMock(return_value={"status": "ok"})}) as d:
            await socket_router.receive_event(event, db=MagicMock(), current_user=_user())
            h = d["list.item_added"]
        self.assertEqual(h.await_args.kwargs.get("op_id"), "op-req")

    async def test_receive_event_falls_back_to_payload_op_id(self):
        event = socket_router.SocketEventRequest(type="list.item_added", payload={"list_id": 1, "op_id": "op-pay"})
        with patch.dict(socket_router._EVENT_HANDLERS, {"list.item_added": AsyncMock(return_value={"status": "ok"})}) as d:
            await socket_router.receive_event(event, db=MagicMock(), current_user=_user())
            h = d["list.item_added"]
        self.assertEqual(h.await_args.kwargs.get("op_id"), "op-pay")


if __name__ == "__main__":
    unittest.main()
