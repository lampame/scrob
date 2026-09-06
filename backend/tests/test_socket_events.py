import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

from fastapi import HTTPException

from models.base import MediaType
from routers import socket as socket_router


class _R:
    """Fake SQLAlchemy result: scalar_one_or_none() + scalars().first()."""

    def __init__(self, scalar=None, first=None):
        self._scalar = scalar
        self._first = first

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return SimpleNamespace(first=lambda: self._first)


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


def _lst():
    return SimpleNamespace(id=1, name="Watchlist")


def _media():
    return SimpleNamespace(id=42, tmdb_id=100, media_type=MediaType.movie, title="Dune")


class SocketListEventTests(unittest.IsolatedAsyncioTestCase):
    async def test_add_by_tmdb_resolves_via_tmdb_fallback(self) -> None:
        media = _media()
        db = _db(
            _R(scalar=_lst()),  # list lookup
            _R(first=None),  # media lookup: miss
            _R(scalar=None),  # duplicate check: none
            _R(scalar=media),  # media fetch for broadcast
        )
        with (
            patch("routers.media.get_user_tmdb_key", new=AsyncMock(return_value=None)),
            patch(
                "core.tmdb.get_movie",
                new=AsyncMock(return_value={"title": "Dune", "vote_average": 8.0}),
            ),
            patch(
                "core.enrichment.create_media_safely",
                new=AsyncMock(return_value=(media, True)),
            ),
        ):
            result = await socket_router._handle_list_event(
                _user(), "list.item_added",
                {"list_id": 1, "tmdb_id": 100, "media_type": "movie"}, db,
            )
        self.assertEqual(result, {"status": "ok", "list_id": 1, "media_id": 42, "item_id": None})
        db.add.assert_called_once()
        db.commit.assert_awaited_once()

    async def test_add_legacy_media_id_unchanged(self) -> None:
        media = _media()
        db = _db(
            _R(scalar=_lst()),
            _R(scalar=None),  # duplicate check: none
            _R(scalar=media),
        )
        result = await socket_router._handle_list_event(
            _user(), "list.item_added", {"list_id": 1, "media_id": 42}, db,
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["media_id"], 42)
        db.commit.assert_awaited_once()

    async def test_add_duplicate_409(self) -> None:
        db = _db(
            _R(scalar=_lst()),
            _R(first=_media()),  # media lookup: hit
            _R(scalar=SimpleNamespace(id=9)),  # duplicate check: exists
        )
        with self.assertRaises(HTTPException) as ctx:
            await socket_router._handle_list_event(
                _user(), "list.item_added",
                {"list_id": 1, "tmdb_id": 100, "media_type": "movie"}, db,
            )
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_remove_by_item_id(self) -> None:
        item = SimpleNamespace(id=9, list_id=1, media_id=42)
        db = _db(
            _R(scalar=_lst()),
            _R(scalar=item),  # item lookup by id
            _R(scalar=_media()),
        )
        result = await socket_router._handle_list_event(
            _user(), "list.item_removed", {"list_id": 1, "item_id": 9}, db,
        )
        self.assertEqual(result, {"status": "ok", "list_id": 1, "media_id": 42, "item_id": 9})
        db.delete.assert_awaited_once_with(item)
        db.commit.assert_awaited_once()

    async def test_remove_missing_404(self) -> None:
        db = _db(_R(scalar=_lst()), _R(scalar=None))
        with self.assertRaises(HTTPException) as ctx:
            await socket_router._handle_list_event(
                _user(), "list.item_removed", {"list_id": 1, "item_id": 999}, db,
            )
        self.assertEqual(ctx.exception.status_code, 404)

    async def test_add_missing_ids_400(self) -> None:
        db = _db(_R(scalar=_lst()))
        with self.assertRaises(HTTPException) as ctx:
            await socket_router._handle_list_event(
                _user(), "list.item_added", {"list_id": 1}, db,
            )
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
