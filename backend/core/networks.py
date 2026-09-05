"""Curated list of major TV networks with their TMDB network ids.

TMDB has no /search/network endpoint, so the search page's "Networks" tab
matches this list by name and unions it with the networks actually attached
to shows in the local DB (routers/media.py). Ids here are verified against
TMDB's /network/{id}. Extend freely - order doesn't matter, results are
ranked by how many local shows use each network.
"""

CURATED_NETWORKS: list[dict] = [
    # Streaming
    {"id": 213, "name": "Netflix", "origin_country": ""},
    {"id": 1024, "name": "Prime Video", "origin_country": ""},
    {"id": 2552, "name": "Apple TV+", "origin_country": ""},
    {"id": 2739, "name": "Disney+", "origin_country": ""},
    {"id": 453, "name": "Hulu", "origin_country": "US"},
    {"id": 6783, "name": "Max", "origin_country": ""},
    {"id": 3186, "name": "HBO Max", "origin_country": ""},
    {"id": 4330, "name": "Paramount+", "origin_country": "US"},
    {"id": 3353, "name": "Peacock", "origin_country": "US"},
    {"id": 1112, "name": "Crunchyroll", "origin_country": "US"},
    {"id": 4025, "name": "BritBox", "origin_country": ""},
    {"id": 2697, "name": "Acorn TV", "origin_country": "US"},
    {"id": 2949, "name": "Shudder", "origin_country": "US"},
    {"id": 6219, "name": "MGM+", "origin_country": "US"},
    # US broadcast
    {"id": 2, "name": "ABC", "origin_country": "US"},
    {"id": 6, "name": "NBC", "origin_country": "US"},
    {"id": 16, "name": "CBS", "origin_country": "US"},
    {"id": 19, "name": "FOX", "origin_country": "US"},
    {"id": 71, "name": "The CW", "origin_country": "US"},
    {"id": 14, "name": "PBS", "origin_country": "US"},
    # US cable
    {"id": 49, "name": "HBO", "origin_country": "US"},
    {"id": 67, "name": "Showtime", "origin_country": "US"},
    {"id": 318, "name": "Starz", "origin_country": "US"},
    {"id": 359, "name": "Cinemax", "origin_country": "US"},
    {"id": 174, "name": "AMC", "origin_country": "US"},
    {"id": 88, "name": "FX", "origin_country": "US"},
    {"id": 77, "name": "Syfy", "origin_country": "US"},
    {"id": 30, "name": "USA Network", "origin_country": "US"},
    {"id": 41, "name": "TNT", "origin_country": "US"},
    {"id": 68, "name": "TBS", "origin_country": "US"},
    {"id": 74, "name": "Bravo", "origin_country": "US"},
    {"id": 47, "name": "Comedy Central", "origin_country": "US"},
    {"id": 56, "name": "Cartoon Network", "origin_country": "US"},
    {"id": 80, "name": "Adult Swim", "origin_country": "US"},
    {"id": 13, "name": "Nickelodeon", "origin_country": "US"},
    {"id": 54, "name": "Disney Channel", "origin_country": "US"},
    {"id": 33, "name": "MTV", "origin_country": "US"},
    {"id": 43, "name": "National Geographic", "origin_country": "US"},
    {"id": 64, "name": "Discovery", "origin_country": "US"},
    {"id": 65, "name": "History", "origin_country": "US"},
    {"id": 129, "name": "A&E", "origin_country": "US"},
    {"id": 34, "name": "Lifetime", "origin_country": "US"},
    {"id": 1267, "name": "Freeform", "origin_country": "US"},
    # UK
    {"id": 4, "name": "BBC One", "origin_country": "GB"},
    {"id": 332, "name": "BBC Two", "origin_country": "GB"},
    {"id": 3, "name": "BBC Three", "origin_country": "GB"},
    {"id": 493, "name": "BBC America", "origin_country": "US"},
    {"id": 9, "name": "ITV1", "origin_country": "GB"},
    {"id": 26, "name": "Channel 4", "origin_country": "GB"},
    {"id": 99, "name": "Channel 5", "origin_country": "GB"},
    {"id": 1063, "name": "Sky Atlantic", "origin_country": "GB"},
    {"id": 214, "name": "Sky One", "origin_country": "GB"},
    # Other
    {"id": 23, "name": "CBC Television", "origin_country": "CA"},
    {"id": 110, "name": "CTV", "origin_country": "CA"},
    {"id": 18, "name": "ABC (AU)", "origin_country": "AU"},
    {"id": 1255, "name": "Stan", "origin_country": "AU"},
    {"id": 290, "name": "TF1", "origin_country": "FR"},
    {"id": 285, "name": "Canal+", "origin_country": "FR"},
    {"id": 1628, "name": "ARTE", "origin_country": "FR"},
    {"id": 308, "name": "Das Erste", "origin_country": "DE"},
    {"id": 31, "name": "ZDF", "origin_country": "DE"},
    {"id": 1, "name": "Fuji TV", "origin_country": "JP"},
    {"id": 98, "name": "TV Tokyo", "origin_country": "JP"},
    {"id": 103, "name": "TV Asahi", "origin_country": "JP"},
]


def search_curated_networks(q: str) -> list[dict]:
    """Curated networks whose name contains `q` (case-insensitive)."""
    needle = q.strip().lower()
    if not needle:
        return []
    return [n for n in CURATED_NETWORKS if needle in n["name"].lower()]
