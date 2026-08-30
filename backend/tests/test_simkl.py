import os
import unittest
from unittest.mock import patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

import httpx

from core import simkl
from core.simkl import SimklHistoryRejected, _history_not_found
from routers.simkl import _simkl_rating_value

_REAL_ASYNC_CLIENT = httpx.AsyncClient


class SimklRatingValueTests(unittest.TestCase):
    """Regression tests for issue #112: Simkl's /sync/ratings response uses
    "user_rating" (most entries None, since it returns every item the user
    has, not just rated ones) - reading the wrong "rating" key made every
    entry look unrated and nothing ever imported."""

    def test_reads_user_rating_field(self):
        item = {"user_rating": 8, "status": "completed", "movie": {"title": "Fight Club"}}
        self.assertEqual(_simkl_rating_value(item), 8.0)

    def test_unrated_item_returns_none(self):
        item = {"user_rating": None, "status": "completed", "movie": {"title": "Fight Club"}}
        self.assertIsNone(_simkl_rating_value(item))

    def test_missing_field_returns_none(self):
        item = {"status": "completed", "movie": {"title": "Fight Club"}}
        self.assertIsNone(_simkl_rating_value(item))

    def test_generic_rating_key_is_ignored(self):
        """The bug itself: a stray "rating" key (used by Simkl's other,
        single-item rate endpoints) must not be mistaken for user_rating."""
        item = {"rating": 9, "user_rating": None}
        self.assertIsNone(_simkl_rating_value(item))

    def test_zero_rating_is_treated_as_unrated(self):
        # Simkl ratings are 1-10; a literal 0 isn't a real rating value.
        item = {"user_rating": 0}
        self.assertIsNone(_simkl_rating_value(item))


class HistoryNotFoundParsingTests(unittest.TestCase):
    def test_dict_of_lists_shape(self):
        payload = {"not_found": {"movies": [], "shows": [{"ids": {"tmdb": 95479}}], "episodes": []}}
        self.assertEqual(_history_not_found(payload), [{"ids": {"tmdb": 95479}}])

    def test_bare_list_shape(self):
        payload = {"not_found": [{"ids": {"tmdb": 1}}]}
        self.assertEqual(_history_not_found(payload), [{"ids": {"tmdb": 1}}])

    def test_empty_not_found(self):
        self.assertEqual(_history_not_found({"added": {"episodes": 1}, "not_found": {"shows": []}}), [])

    def test_non_dict_payload(self):
        self.assertEqual(_history_not_found(None), [])


class AddToHistoryRejectionTests(unittest.IsolatedAsyncioTestCase):
    """#328: Simkl reports a season-layout mismatch (absolute-ordered anime past
    the first cour) as `not_found` *inside* a 201, so raise_for_status() alone
    treats the lost watch as success. The single-item history helpers must
    surface it."""

    def _patched(self, handler):
        transport = httpx.MockTransport(handler)
        return patch.object(
            simkl.httpx, "AsyncClient",
            side_effect=lambda **kwargs: _REAL_ASYNC_CLIENT(transport=transport, **kwargs),
        )

    async def test_episode_rejected_when_returned_in_not_found(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(201, json={
                "added": {"episodes": 0},
                "not_found": {"shows": [{"ids": {"tmdb": 95479}, "seasons": [{"number": 1}]}]},
            })

        with self._patched(handler):
            with self.assertRaises(SimklHistoryRejected):
                await simkl.add_episode_to_history("cid", "tok", 95479, 1, 25)

    async def test_episode_accepted_when_added(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(201, json={
                "added": {"episodes": 1}, "not_found": {"shows": [], "episodes": []},
            })

        with self._patched(handler):
            await simkl.add_episode_to_history("cid", "tok", 95479, 2, 1)  # no raise

    async def test_movie_rejected_when_returned_in_not_found(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(201, json={
                "added": {"movies": 0}, "not_found": {"movies": [{"ids": {"tmdb": 999999}}]},
            })

        with self._patched(handler):
            with self.assertRaises(SimklHistoryRejected):
                await simkl.add_movie_to_history("cid", "tok", 999999)

    async def test_batch_logs_but_does_not_raise_on_partial_not_found(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(201, json={
                "added": {"episodes": 1},
                "not_found": {"shows": [{"ids": {"tmdb": 95479}}]},
            })

        with self._patched(handler):
            with self.assertLogs("core.simkl", level="WARNING") as logs:
                await simkl.add_history_batch("cid", "tok", [], [(95479, 1, 25, None), (95479, 2, 1, None)])
        self.assertTrue(any("could not resolve" in m for m in logs.output))


if __name__ == "__main__":
    unittest.main()
