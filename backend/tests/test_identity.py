"""Unit tests for core/identity.py (dual provider identity, step 1 of
docs/tvdb-first-class-plan.md)."""

import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from core.identity import (
    coerce_id,
    external_ids_from_tmdb,
    find_media,
    find_show,
    link_media_ids,
    link_show_ids,
)
from models.base import MediaType
from models.media import Media
from models.show import Show


class CoerceIdTests(unittest.TestCase):
    def test_accepts_positive_ints_and_numeric_strings(self):
        self.assertEqual(coerce_id(5), 5)
        self.assertEqual(coerce_id("73762"), 73762)

    def test_rejects_zero_negative_none_and_junk(self):
        for value in (0, -1, None, "", "abc", "tt123"):
            self.assertIsNone(coerce_id(value), value)


class ExternalIdsFromTmdbTests(unittest.TestCase):
    def test_extracts_tvdb_and_imdb(self):
        data = {"external_ids": {"tvdb_id": 73762, "imdb_id": "tt0411008"}}
        self.assertEqual(external_ids_from_tmdb(data), (73762, "tt0411008"))

    def test_missing_or_empty_is_none_pair(self):
        self.assertEqual(external_ids_from_tmdb(None), (None, None))
        self.assertEqual(external_ids_from_tmdb({}), (None, None))
        self.assertEqual(external_ids_from_tmdb({"external_ids": {"tvdb_id": None, "imdb_id": ""}}), (None, None))


class LinkMediaIdsTests(unittest.TestCase):
    def test_fills_missing_ids_only(self):
        media = Media(media_type=MediaType.episode, tmdb_id=None, tvdb_id=None, imdb_id=None)
        changed = link_media_ids(media, tmdb_id=10, tvdb_id=20, imdb_id="tt1")
        self.assertTrue(changed)
        self.assertEqual((media.tmdb_id, media.tvdb_id, media.imdb_id), (10, 20, "tt1"))

    def test_never_overwrites_existing_ids(self):
        media = Media(media_type=MediaType.episode, tmdb_id=1, tvdb_id=2, imdb_id="tt9")
        changed = link_media_ids(media, tmdb_id=10, tvdb_id=20, imdb_id="tt1")
        self.assertFalse(changed)
        self.assertEqual((media.tmdb_id, media.tvdb_id, media.imdb_id), (1, 2, "tt9"))

    def test_rejects_non_imdb_strings(self):
        media = Media(media_type=MediaType.movie)
        self.assertFalse(link_media_ids(media, imdb_id="12345"))
        self.assertIsNone(media.imdb_id)


def _db_returning(rows_by_call):
    """An AsyncSession stand-in whose execute() yields the given result rows
    in order. Each entry is a list of ORM objects (scalars) or a list of
    tuples (for select(Show.id) style queries)."""
    db = MagicMock()
    results = []
    for rows in rows_by_call:
        res = MagicMock()
        res.scalars.return_value.first.return_value = rows[0] if rows else None
        res.scalar_one_or_none.return_value = rows[0] if rows else None
        res.first.return_value = rows[0] if rows else None
        results.append(res)
    db.execute = AsyncMock(side_effect=results)
    return db


class FindMediaTests(unittest.IsolatedAsyncioTestCase):
    async def test_media_id_wins(self):
        row = Media(id=7, media_type=MediaType.episode)
        db = _db_returning([[row]])
        found = await find_media(db, MediaType.episode, media_id=7, tmdb_id=1, tvdb_id=2)
        self.assertIs(found, row)
        self.assertEqual(db.execute.await_count, 1)

    async def test_falls_back_from_tmdb_to_tvdb(self):
        row = Media(id=8, media_type=MediaType.episode, tvdb_id=2)
        db = _db_returning([[], [row]])
        found = await find_media(db, MediaType.episode, tmdb_id=1, tvdb_id=2)
        self.assertIs(found, row)
        self.assertEqual(db.execute.await_count, 2)

    async def test_no_ids_means_no_query(self):
        db = _db_returning([])
        self.assertIsNone(await find_media(db, MediaType.movie))
        self.assertEqual(db.execute.await_count, 0)


class FindShowTests(unittest.IsolatedAsyncioTestCase):
    async def test_tvdb_only_lookup(self):
        show = Show(id=3, tvdb_id=73762)
        db = _db_returning([[show]])
        self.assertIs(await find_show(db, tvdb_id=73762), show)


class LinkShowIdsTests(unittest.IsolatedAsyncioTestCase):
    async def test_fills_free_tvdb_id(self):
        show = Show(id=1, tmdb_id=100, tvdb_id=None)
        with patch("core.identity.show_tvdb_id_is_free", AsyncMock(return_value=True)):
            changed = await link_show_ids(MagicMock(), show, tvdb_id=73762)
        self.assertTrue(changed)
        self.assertEqual(show.tvdb_id, 73762)

    async def test_skips_tvdb_id_held_by_another_show(self):
        show = Show(id=1, tmdb_id=100, tvdb_id=None)
        with patch("core.identity.show_tvdb_id_is_free", AsyncMock(return_value=False)):
            changed = await link_show_ids(MagicMock(), show, tvdb_id=73762)
        self.assertFalse(changed)
        self.assertIsNone(show.tvdb_id)

    async def test_never_overwrites_existing_link(self):
        show = Show(id=1, tmdb_id=100, tvdb_id=1)
        with patch("core.identity.show_tvdb_id_is_free", AsyncMock(return_value=True)) as free:
            changed = await link_show_ids(MagicMock(), show, tvdb_id=73762, tmdb_id=200)
        self.assertFalse(changed)
        self.assertEqual((show.tmdb_id, show.tvdb_id), (100, 1))
        free.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
