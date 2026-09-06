import os
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

from models.base import MediaType
from models.lists import List as ListModel
from routers import lists


class ClearAllListsTests(unittest.IsolatedAsyncioTestCase):
    async def test_deletes_every_list_owned_by_the_user(self) -> None:
        db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock())

        response = await lists.clear_all_lists(db=db, current_user=SimpleNamespace(id=7))

        self.assertEqual(response["status"], "ok")
        db.execute.assert_awaited_once()
        stmt = db.execute.call_args.args[0]
        self.assertEqual(stmt.table.name, ListModel.__tablename__)
        db.commit.assert_awaited_once()


class _Scalars:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value


class _OneOrNone:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value

    def scalars(self):
        return _Scalars(self._value)


def _media():
    return SimpleNamespace(
        id=5,
        tmdb_id=123,
        media_type=MediaType.movie,
        title="Dune",
        poster_path="/p.jpg",
        backdrop_path="/b.jpg",
        release_date="2021-01-01",
        adult=True,
        tmdb_rating=8.0,
        season_number=None,
        episode_number=None,
        show=None,
        tmdb_data={},
    )


class ListItemSocketPayloadTests(unittest.IsolatedAsyncioTestCase):
    async def test_add_emits_item_id_and_art(self) -> None:
        media = _media()
        lst = SimpleNamespace(id=1, name="Watchlist", trakt_slug=None, mdblist_slug=None)
        formatted_item = SimpleNamespace(
            id=77,
            list_id=1,
            added_at=datetime(2024, 1, 1),
            sort_order=0,
            notes=None,
            season_number=None,
            media=media,
        )
        db = SimpleNamespace(
            execute=AsyncMock(side_effect=[
                _OneOrNone(lst),
                _OneOrNone(media),
                _OneOrNone(None),
                _OneOrNone(formatted_item),
            ]),
            commit=AsyncMock(),
            delete=AsyncMock(),
        )

        def _fake_add(obj):
            obj.id = 77

        db.add = _fake_add
        body = lists.ListItemAdd(tmdb_id=123, media_type=MediaType.movie)
        user = SimpleNamespace(id=1, username="alice")
        with (
            patch("routers.media.get_user_tmdb_key", new=AsyncMock(return_value="k")),
            patch("routers.lists.enrich_with_state", new=AsyncMock()),
            patch("core.socket.manager.socket_manager.emit", new=AsyncMock()) as emit,
        ):
            await lists.add_list_item(list_id=1, body=body, db=db, current_user=user)
        payload = emit.await_args.kwargs["payload"]
        self.assertEqual(emit.await_args.kwargs["event_type"], "list.item_added")
        self.assertEqual(payload["item_id"], 77)
        self.assertEqual(payload["poster_path"], "/p.jpg")
        self.assertEqual(payload["backdrop_path"], "/b.jpg")
        self.assertEqual(payload["release_date"], "2021-01-01")

    async def test_remove_emits_item_id_and_art(self) -> None:
        media = _media()
        lst = SimpleNamespace(id=1, name="Watchlist", trakt_slug=None, mdblist_slug=None)
        item = SimpleNamespace(id=77, media=media, season_number=None, list_id=1)
        db = SimpleNamespace(
            execute=AsyncMock(side_effect=[_OneOrNone(item), _OneOrNone(lst)]),
            commit=AsyncMock(),
            delete=AsyncMock(),
        )
        user = SimpleNamespace(id=1, username="alice")
        with patch("core.socket.manager.socket_manager.emit", new=AsyncMock()) as emit:
            await lists.remove_list_item(list_id=1, item_id=77, db=db, current_user=user)
        payload = emit.await_args.kwargs["payload"]
        self.assertEqual(emit.await_args.kwargs["event_type"], "list.item_removed")
        self.assertEqual(payload["item_id"], 77)
        self.assertEqual(payload["poster_path"], "/p.jpg")
        self.assertEqual(payload["backdrop_path"], "/b.jpg")
        self.assertEqual(payload["release_date"], "2021-01-01")


if __name__ == "__main__":
    unittest.main()
