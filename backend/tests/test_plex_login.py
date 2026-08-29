import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

import httpx
from fastapi import FastAPI

import schemas
from core import plex
from db import get_db
from dependencies import get_current_user
from routers import auth


_REAL_ASYNC_CLIENT = httpx.AsyncClient


def _mock_client(transport: httpx.MockTransport):
    return patch.object(
        plex.httpx,
        "AsyncClient",
        side_effect=lambda **kw: _REAL_ASYNC_CLIENT(
            transport=transport, **{k: v for k, v in kw.items() if k != "verify"}
        ),
    )


class PlexAccountAuthClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_and_poll_pin(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "POST" and request.url.path == "/api/v2/pins":
                self.assertEqual(request.url.params["strong"], "true")
                self.assertEqual(request.headers["X-Plex-Client-Identifier"], "scrob-abc")
                return httpx.Response(201, json={"id": 42, "code": "WXYZ"})
            if request.url.path == "/api/v2/pins/42":
                return httpx.Response(200, json={"id": 42, "authToken": "tok-123"})
            return httpx.Response(404)

        with _mock_client(httpx.MockTransport(handler)):
            pin = await plex.create_auth_pin("scrob-abc")
            self.assertEqual(pin, {"id": 42, "code": "WXYZ"})
            token = await plex.poll_auth_pin("scrob-abc", 42)
        self.assertEqual(token, "tok-123")

    async def test_poll_pin_pending_returns_none(self) -> None:
        handler = lambda r: httpx.Response(200, json={"id": 1, "authToken": None})
        with _mock_client(httpx.MockTransport(handler)):
            self.assertIsNone(await plex.poll_auth_pin("cid", 1))

    def test_build_auth_url_carries_code_and_product(self) -> None:
        url = plex.build_auth_url("cid-1", "PINC")
        self.assertTrue(url.startswith("https://app.plex.tv/auth#?"))
        self.assertIn("clientID=cid-1", url)
        self.assertIn("code=PINC", url)
        self.assertIn("product", url)

    async def test_get_account_maps_fields(self) -> None:
        handler = lambda r: httpx.Response(
            200, json={"id": 777, "username": "neo", "title": "Thomas", "email": "n@zion.io"}
        )
        with _mock_client(httpx.MockTransport(handler)):
            acct = await plex.get_account("cid", "tok")
        self.assertEqual(acct, {"id": "777", "username": "neo", "title": "Thomas", "email": "n@zion.io"})

    async def test_get_servers_filters_non_servers_and_maps_connections(self) -> None:
        resources = [
            {
                "name": "Home",
                "clientIdentifier": "machine-1",
                "provides": "server",
                "owned": True,
                "accessToken": "srv-tok-1",
                "connections": [
                    {"uri": "https://10-0-0-2.abc.plex.direct:32400", "local": True, "relay": False, "protocol": "https"},
                    {"uri": "https://relay", "local": False, "relay": True, "protocol": "https"},
                ],
            },
            {"name": "Some Player", "clientIdentifier": "p1", "provides": "player", "connections": []},
        ]
        with _mock_client(httpx.MockTransport(lambda r: httpx.Response(200, json=resources))):
            servers = await plex.get_servers("cid", "acct-tok")
        self.assertEqual(len(servers), 1)
        self.assertEqual(servers[0]["machine_identifier"], "machine-1")
        self.assertEqual(servers[0]["access_token"], "srv-tok-1")
        self.assertEqual(len(servers[0]["connections"]), 2)

    async def test_resolve_connections_drops_blocked_uris(self) -> None:
        server = {
            "machine_identifier": "m",
            "access_token": "t",
            "connections": [
                {"uri": "http://169.254.169.254", "local": True, "relay": False},
                {"uri": "https://plex.example:32400", "local": False, "relay": False},
            ],
        }

        async def _safe(url: str) -> bool:
            return "169.254" not in url

        def handler(request: httpx.Request) -> httpx.Response:
            self.assertNotIn("169.254", str(request.url))
            return httpx.Response(200, json={"MediaContainer": {"machineIdentifier": "m"}})

        with patch("core.url_validator.is_safe_service_url", _safe), _mock_client(httpx.MockTransport(handler)):
            probe = await plex.resolve_connections(server)

        self.assertEqual([c["uri"] for c in probe["connections"]], ["https://plex.example:32400"])

    async def test_resolve_connections_orders_and_tags_reachability(self) -> None:
        server = {
            "name": "Home",
            "machine_identifier": "machine-1",
            "access_token": "t",
            "connections": [
                {"uri": "https://relay", "local": False, "relay": True},
                {"uri": "https://local", "local": True, "relay": False},
                {"uri": "https://remote", "local": False, "relay": False},
            ],
        }

        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.url.path, "/identity")
            if request.url.host == "local":
                return httpx.Response(200, json={"MediaContainer": {"machineIdentifier": "machine-1"}})
            if request.url.host == "remote":
                return httpx.Response(200, json={"MediaContainer": {"machineIdentifier": "other"}})
            raise httpx.ConnectError("nope")

        with patch("core.url_validator.is_safe_service_url", AsyncMock(return_value=True)), \
             _mock_client(httpx.MockTransport(handler)):
            probe = await plex.resolve_connections(server)

        self.assertEqual([c["uri"] for c in probe["connections"]], ["https://local", "https://remote", "https://relay"])
        self.assertEqual([c["reachable"] for c in probe["connections"]], [True, False, False])
        self.assertEqual(probe["recommended"], "https://local")
        self.assertTrue(probe["connections"][0]["label"].startswith("Local · "))

    async def test_resolve_connections_falls_back_when_nothing_answers(self) -> None:
        server = {
            "machine_identifier": "m",
            "access_token": "t",
            "connections": [
                {"uri": "https://remote", "local": False, "relay": False},
                {"uri": "https://local", "local": True, "relay": False},
            ],
        }

        with patch("core.url_validator.is_safe_service_url", AsyncMock(return_value=True)), \
             _mock_client(httpx.MockTransport(lambda r: (_ for _ in ()).throw(httpx.ConnectError("nope")))):
            probe = await plex.resolve_connections(server)
        self.assertEqual(probe["recommended"], "https://local")  # best-ranked candidate
        self.assertFalse(any(c["reachable"] for c in probe["connections"]))


class _FakeGlobalSettings:
    def __init__(self):
        self.id = 1
        self.plex_client_identifier = None


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeSession:
    def __init__(self, gs):
        self._gs = gs
        self.commits = 0

    async def execute(self, _stmt):
        return _FakeResult(self._gs)

    def add(self, _obj):
        pass

    async def commit(self):
        self.commits += 1


class PlexPinEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.gs = _FakeGlobalSettings()
        self.session = _FakeSession(self.gs)
        auth._PLEX_PIN_CACHE.clear()

        app = FastAPI()
        app.include_router(auth.router, prefix="/auth")

        async def _override_get_db():
            yield self.session

        app.dependency_overrides[get_db] = _override_get_db
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, is_admin=False)
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        )
        self.addAsyncCleanup(self.client.aclose)

    async def test_start_generates_client_id_and_caches_pin(self):
        with patch.object(plex, "create_auth_pin", AsyncMock(return_value={"id": 9, "code": "CODE9"})):
            res = await self.client.post("/auth/plex/pin/start")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["pin_id"], 9)
        self.assertIn("code=CODE9", body["auth_url"])
        self.assertTrue(self.gs.plex_client_identifier.startswith("scrob-"))
        self.assertEqual(auth._PLEX_PIN_CACHE[1]["pin_id"], 9)

    async def test_poll_pending_then_connected_returns_servers(self):
        self.gs.plex_client_identifier = "scrob-fixed"
        auth._PLEX_PIN_CACHE[1] = {
            "pin_id": 9,
            "client_id": "scrob-fixed",
            "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        }

        with patch.object(plex, "poll_auth_pin", AsyncMock(return_value=None)):
            pending = await self.client.post("/auth/plex/pin/poll")
        self.assertEqual(pending.json(), {"status": "pending"})

        account = {"id": "5", "username": "trin", "title": "Trinity", "email": "t@zion.io"}
        servers = [{
            "name": "Home", "machine_identifier": "m1", "owned": True,
            "access_token": "srv-tok", "connections": [{"uri": "https://local", "local": True, "relay": False}],
        }]
        probe = {
            "recommended": "https://local",
            "connections": [{
                "uri": "https://local", "local": True, "relay": False,
                "protocol": "https", "reachable": True, "label": "Local · https://local",
            }],
        }
        with patch.object(plex, "poll_auth_pin", AsyncMock(return_value="acct-tok")), \
             patch.object(plex, "get_account", AsyncMock(return_value=account)), \
             patch.object(plex, "get_servers", AsyncMock(return_value=servers)), \
             patch.object(plex, "resolve_connections", AsyncMock(return_value=probe)):
            done = await self.client.post("/auth/plex/pin/poll")

        body = done.json()
        self.assertEqual(body["status"], "connected")
        self.assertEqual(body["account"]["username"], "trin")
        self.assertEqual(body["auth_token"], "acct-tok")
        self.assertEqual(len(body["servers"]), 1)
        self.assertEqual(body["servers"][0]["url"], "https://local")
        self.assertEqual(body["servers"][0]["token"], "srv-tok")
        self.assertEqual(body["servers"][0]["connections"], probe["connections"])
        self.assertNotIn(1, auth._PLEX_PIN_CACHE)  # single-use

    async def test_poll_without_pending_pin_is_rejected(self):
        res = await self.client.post("/auth/plex/pin/poll")
        self.assertEqual(res.status_code, 400)


class PlexConnectionSchemaTests(unittest.TestCase):
    def test_create_schema_carries_plex_login_fields(self):
        body = schemas.MediaServerConnectionCreate(
            type="plex", name="Home", url="https://local", token="srv-tok",
            plex_auth_token="acct-tok", plex_account_id="5", plex_machine_identifier="m1",
        )
        self.assertEqual(body.plex_auth_token, "acct-tok")
        self.assertEqual(body.plex_account_id, "5")
        self.assertEqual(body.plex_machine_identifier, "m1")

    def test_response_schema_omits_account_token(self):
        self.assertNotIn("plex_auth_token", schemas.MediaServerConnectionResponse.model_fields)


if __name__ == "__main__":
    unittest.main()
