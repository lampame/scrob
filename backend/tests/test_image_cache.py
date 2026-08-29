import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

import httpx
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from core import image_cache
from models.image_cache import ImageCache

_REAL_ASYNC_CLIENT = httpx.AsyncClient


class ParseImageUrlTests(unittest.TestCase):
    def test_tmdb_url(self):
        self.assertEqual(
            image_cache.parse_image_url("https://image.tmdb.org/t/p/w500/abc.jpg"),
            ("w500", "/abc.jpg"),
        )

    def test_tvdb_url_uses_the_tvdb_bucket(self):
        self.assertEqual(
            image_cache.parse_image_url("https://artworks.thetvdb.com/banners/v4/series/1/posters/x.jpg"),
            ("tvdb", "/banners/v4/series/1/posters/x.jpg"),
        )

    def test_bare_path_defaults_to_tmdb_w500(self):
        self.assertEqual(image_cache.parse_image_url("/abc.jpg"), ("w500", "/abc.jpg"))

    def test_unknown_host_is_ignored(self):
        self.assertEqual(image_cache.parse_image_url("https://evil.example/x.jpg"), (None, None))

    def test_back_compat_alias(self):
        self.assertIs(image_cache.parse_tmdb_url, image_cache.parse_image_url)

    def test_upstream_url_by_bucket(self):
        self.assertEqual(
            image_cache.upstream_image_url("w342", "/a.jpg"),
            "https://image.tmdb.org/t/p/w342/a.jpg",
        )
        self.assertEqual(
            image_cache.upstream_image_url("tvdb", "/banners/x.jpg"),
            "https://artworks.thetvdb.com/banners/x.jpg",
        )


class DownloadAndCacheTvdbImageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine(
            "sqlite+aiosqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        async with self.engine.begin() as conn:
            await conn.run_sync(ImageCache.__table__.create)
        self.Session = async_sessionmaker(self.engine, expire_on_commit=False)
        self.tmp = Path(tempfile.mkdtemp())
        self._patch = patch.object(image_cache.settings, "data_dir", self.tmp)
        self._patch.start()
        self.addAsyncCleanup(self.engine.dispose)
        self.addCleanup(self._patch.stop)

    def _transport(self, seen: list[str]):
        def handler(request: httpx.Request) -> httpx.Response:
            seen.append(str(request.url))
            return httpx.Response(200, content=b"\x89PNG-bytes", headers={"Content-Type": "image/png"})
        return httpx.MockTransport(handler)

    async def test_tvdb_image_is_fetched_from_thetvdb_and_stored(self):
        seen: list[str] = []
        path = "/banners/v4/series/424/posters/hash.jpg"
        with patch.object(
            image_cache.httpx, "AsyncClient",
            side_effect=lambda **kw: _REAL_ASYNC_CLIENT(transport=self._transport(seen), **kw),
        ):
            async with self.Session() as db:
                local = await image_cache.download_and_cache_image(db, "tvdb", path)

        self.assertEqual(seen, ["https://artworks.thetvdb.com/banners/v4/series/424/posters/hash.jpg"])
        self.assertTrue(local and Path(local).is_file())
        self.assertEqual(Path(local).read_bytes(), b"\x89PNG-bytes")
        self.assertEqual(Path(local), self.tmp / "image_cache" / "tvdb" / path.lstrip("/"))

        async with self.Session() as db:
            rows = (await db.execute(ImageCache.__table__.select())).all()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0].path, rows[0].size), (path, "tvdb"))

    async def test_second_call_serves_the_cached_file_without_refetching(self):
        seen: list[str] = []
        path = "/banners/v4/series/1/posters/a.jpg"
        with patch.object(
            image_cache.httpx, "AsyncClient",
            side_effect=lambda **kw: _REAL_ASYNC_CLIENT(transport=self._transport(seen), **kw),
        ):
            async with self.Session() as db:
                await image_cache.download_and_cache_image(db, "tvdb", path)
            async with self.Session() as db:
                await image_cache.download_and_cache_image(db, "tvdb", path)
        self.assertEqual(len(seen), 1)

    async def test_rejects_path_traversal(self):
        async with self.Session() as db:
            self.assertIsNone(await image_cache.download_and_cache_image(db, "tvdb", "/../../etc/passwd"))


if __name__ == "__main__":
    unittest.main()
