import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

import httpx
from fastapi import FastAPI

from db import get_db
from dependencies import require_admin
from routers import admin


class _Result:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeDB:
    """Minimal AsyncSession stand-in for admin_heal_metadata: one settings
    lookup, then add/commit/refresh of the SyncJob."""

    def __init__(self):
        self.added = []
        self.info = {}

    async def execute(self, _stmt):
        return _Result(None)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        obj.id = 123


class AdminHealTmdbKeyResolutionTests(unittest.IsolatedAsyncioTestCase):
    """#336: the server-wide heal must resolve the TMDB key the same way every
    other TMDB path does - this admin's own key, then the global one - not
    require a global key specifically."""

    async def asyncSetUp(self):
        self.db = _FakeDB()
        app = FastAPI()
        app.include_router(admin.router, prefix="/admin")

        async def _override_db():
            yield self.db

        app.dependency_overrides[get_db] = _override_db
        app.dependency_overrides[require_admin] = lambda: SimpleNamespace(id=1, is_admin=True)
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        )
        self.addAsyncCleanup(self.client.aclose)

    async def test_starts_with_a_per_user_key_when_no_global_key(self):
        with (
            patch("routers.sync._get_effective_tmdb_key", AsyncMock(return_value="user-key")),
            patch("routers.admin.run_admin_heal", AsyncMock()),
        ):
            res = await self.client.post("/admin/maintenance/heal")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "started")

    async def test_passes_the_resolved_key_to_the_background_task(self):
        captured = {}

        def _capture(*args, **kwargs):
            captured["key"] = args[0]

        with (
            patch("routers.sync._get_effective_tmdb_key", AsyncMock(return_value="resolved-key")),
            patch("routers.admin.run_admin_heal", side_effect=_capture),
        ):
            await self.client.post("/admin/maintenance/heal")
        self.assertEqual(captured["key"], "resolved-key")

    async def test_400_only_when_no_key_at_all(self):
        with patch("routers.sync._get_effective_tmdb_key", AsyncMock(return_value=None)):
            res = await self.client.post("/admin/maintenance/heal")
        self.assertEqual(res.status_code, 400)
        detail = res.json()["detail"]
        self.assertIn("TMDB", detail)
        self.assertIn("Settings", detail)  # points the user somewhere


if __name__ == "__main__":
    unittest.main()
