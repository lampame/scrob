import os
import unittest

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

from core.networks import CURATED_NETWORKS, search_curated_networks


class CuratedNetworkSearchTests(unittest.TestCase):
    def test_every_entry_has_int_id_and_name(self) -> None:
        for n in CURATED_NETWORKS:
            self.assertIsInstance(n["id"], int)
            self.assertTrue(n["name"])

    def test_ids_are_unique(self) -> None:
        ids = [n["id"] for n in CURATED_NETWORKS]
        self.assertEqual(len(ids), len(set(ids)))

    def test_case_insensitive_substring_match(self) -> None:
        names = {n["name"] for n in search_curated_networks("hbo")}
        self.assertIn("HBO", names)
        self.assertIn("HBO Max", names)

    def test_partial_match(self) -> None:
        names = {n["name"] for n in search_curated_networks("bbc")}
        self.assertIn("BBC One", names)
        self.assertIn("BBC Two", names)

    def test_blank_query_returns_nothing(self) -> None:
        self.assertEqual(search_curated_networks("   "), [])

    def test_no_match_returns_empty(self) -> None:
        self.assertEqual(search_curated_networks("zzzznotarealnetwork"), [])


if __name__ == "__main__":
    unittest.main()
