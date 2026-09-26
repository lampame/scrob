"""Provider-agnostic identity lookups for Media and Show rows.

Step 1 of docs/tvdb-first-class-plan.md. A row can be known by its local id,
its TMDB id, or its TVDB id. Endpoints that accept a client-supplied
identifier should resolve it through here instead of hard-coding
``Media.tmdb_id == ...``, so a TVDB-only episode (tmdb_id NULL) is reachable
by the same code path as a TMDB one.

Rules:
- Local id wins when given (it is unambiguous).
- TMDB and TVDB ids are looked up on their own columns only - a TVDB id is
  never tried against tmdb_id or vice versa. The two id spaces overlap
  numerically, so a cross-column guess would be a wrong-row bug waiting to
  happen.
- ``link_*`` helpers only ever FILL a missing id; they never overwrite an
  existing different one. For shows, ``tvdb_id`` and ``tmdb_id`` are unique,
  so a link is skipped when another row already holds that id.
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.base import MediaType
from models.media import Media
from models.show import Show

logger = logging.getLogger(__name__)


def coerce_id(value) -> Optional[int]:
    """A positive int from an int/str id, else None."""
    try:
        iv = int(value)
    except (TypeError, ValueError):
        return None
    return iv if iv > 0 else None


_valid_id = coerce_id


async def find_media(
    db: AsyncSession,
    media_type: MediaType,
    *,
    media_id: int | None = None,
    tmdb_id: int | None = None,
    tvdb_id: int | None = None,
    load_show: bool = False,
) -> Optional[Media]:
    """Resolve one Media row of ``media_type`` by whichever id is supplied.

    Duplicate rows for the same external id (pre-dedup data) resolve to the
    oldest row, matching the convention the ratings/lists routers already
    used (#157).
    """
    stmt = select(Media).where(Media.media_type == media_type)
    if load_show:
        stmt = stmt.options(selectinload(Media.show))

    if _valid_id(media_id):
        res = await db.execute(stmt.where(Media.id == int(media_id)))
        return res.scalars().first()
    if _valid_id(tmdb_id):
        res = await db.execute(stmt.where(Media.tmdb_id == int(tmdb_id)).order_by(Media.id))
        found = res.scalars().first()
        if found:
            return found
    if _valid_id(tvdb_id):
        res = await db.execute(stmt.where(Media.tvdb_id == int(tvdb_id)).order_by(Media.id))
        return res.scalars().first()
    return None


async def find_show(
    db: AsyncSession,
    *,
    show_id: int | None = None,
    tmdb_id: int | None = None,
    tvdb_id: int | None = None,
) -> Optional[Show]:
    """Resolve one Show row by local id, TMDB id or TVDB id (in that order)."""
    if _valid_id(show_id):
        res = await db.execute(select(Show).where(Show.id == int(show_id)))
        return res.scalar_one_or_none()
    if _valid_id(tmdb_id):
        res = await db.execute(select(Show).where(Show.tmdb_id == int(tmdb_id)))
        found = res.scalar_one_or_none()
        if found:
            return found
    if _valid_id(tvdb_id):
        res = await db.execute(select(Show).where(Show.tvdb_id == int(tvdb_id)))
        return res.scalar_one_or_none()
    return None


async def show_tvdb_id_is_free(db: AsyncSession, tvdb_id: int, *, except_show_id: int | None = None) -> bool:
    stmt = select(Show.id).where(Show.tvdb_id == tvdb_id)
    if except_show_id is not None:
        stmt = stmt.where(Show.id != except_show_id)
    res = await db.execute(stmt.limit(1))
    return res.scalar_one_or_none() is None


async def show_tmdb_id_is_free(db: AsyncSession, tmdb_id: int, *, except_show_id: int | None = None) -> bool:
    stmt = select(Show.id).where(Show.tmdb_id == tmdb_id)
    if except_show_id is not None:
        stmt = stmt.where(Show.id != except_show_id)
    res = await db.execute(stmt.limit(1))
    return res.scalar_one_or_none() is None


async def link_show_ids(
    db: AsyncSession,
    show: Show,
    *,
    tmdb_id: int | None = None,
    tvdb_id: int | None = None,
) -> bool:
    """Fill a missing tmdb_id / tvdb_id on ``show``. Returns True if anything
    changed. Never overwrites an existing different id, and never claims an
    id another Show row already holds (both columns are unique) - that case
    is logged and left alone rather than crashing the caller's transaction.
    """
    changed = False
    tvdb = _valid_id(tvdb_id)
    if tvdb and not show.tvdb_id:
        if await show_tvdb_id_is_free(db, tvdb, except_show_id=show.id):
            show.tvdb_id = tvdb
            changed = True
        else:
            logger.info("Show %s: tvdb_id %s already belongs to another show, not linking", show.id, tvdb)
    tmdb = _valid_id(tmdb_id)
    if tmdb and not show.tmdb_id:
        if await show_tmdb_id_is_free(db, tmdb, except_show_id=show.id):
            show.tmdb_id = tmdb
            changed = True
        else:
            logger.info("Show %s: tmdb_id %s already belongs to another show, not linking", show.id, tmdb)
    return changed


def link_media_ids(
    media: Media,
    *,
    tmdb_id: int | None = None,
    tvdb_id: int | None = None,
    imdb_id: str | None = None,
) -> bool:
    """Fill missing provider ids on a Media row (no uniqueness concern - the
    media unique index only covers tmdb_id, and callers only set tmdb_id
    from a TMDB response for that very row)."""
    changed = False
    tmdb = _valid_id(tmdb_id)
    if tmdb and not media.tmdb_id:
        media.tmdb_id = tmdb
        changed = True
    tvdb = _valid_id(tvdb_id)
    if tvdb and not media.tvdb_id:
        media.tvdb_id = tvdb
        changed = True
    if imdb_id and isinstance(imdb_id, str) and imdb_id.startswith("tt") and not media.imdb_id:
        media.imdb_id = imdb_id[:20]
        changed = True
    return changed


def external_ids_from_tmdb(data: dict | None) -> tuple[Optional[int], Optional[str]]:
    """(tvdb_id, imdb_id) from a TMDB response carrying an ``external_ids``
    append (movie, show, season or episode)."""
    ext = (data or {}).get("external_ids") or {}
    return _valid_id(ext.get("tvdb_id")), (ext.get("imdb_id") or None)
