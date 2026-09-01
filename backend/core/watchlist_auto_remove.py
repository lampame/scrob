"""Auto-remove watched titles from user's selected watchlist."""

import asyncio
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.lists import List, ListItem
from models.users import UserSettings


async def auto_remove_from_watchlist(
    db: AsyncSession,
    user_id: int,
    media_id: int,
) -> None:
    """
    Remove a title from the user's selected auto-remove watchlist.
    Called after successful WatchEvent creation for completed watches.
    """
    # 1. Get user's auto-remove list setting
    result = await db.execute(
        select(UserSettings.watchlist_auto_remove_id).where(
            UserSettings.user_id == user_id
        )
    )
    list_id: Optional[int] = result.scalar_one_or_none()

    if list_id is None:
        return  # Auto-remove disabled

    # 2. Find the list item
    result = await db.execute(
        select(ListItem)
        .options(selectinload(ListItem.media))
        .join(List, List.id == ListItem.list_id)
        .where(
            ListItem.list_id == list_id,
            ListItem.media_id == media_id,
            List.user_id == user_id,  # Security: ensure ownership
        )
    )
    item = result.scalar_one_or_none()

    if item is None:
        return  # Title not in watchlist

    # 3. Capture data before delete
    lst = item.list if hasattr(item, "list") else None
    media = item.media
    season_number = item.season_number

    # 4. Delete the item
    await db.delete(item)
    await db.flush()

    # 5. Emit socket event
    from core.socket.manager import socket_manager

    await socket_manager.emit(
        event_type="list.item_removed",
        payload={
            "list_id": list_id,
            "list_name": lst.name if lst else None,
            "media_id": media_id,
            "media_tmdb_id": media.tmdb_id if media else None,
            "media_type": media.media_type if media else None,
            "media_title": media.title if media else None,
        },
    )

    # 6. Push to providers (fire-and-forget, errors are non-fatal)
    tasks = []

    if lst and lst.trakt_slug and media:
        from backend.routers.lists import _push_list_item_to_trakt

        tasks.append(
            _push_list_item_to_trakt(
                db, user_id, lst.trakt_slug, media, season_number=season_number, remove=True
            )
        )
        if lst.trakt_slug == "__plex_watchlist__":
            from backend.routers.lists import _push_list_item_to_plex_watchlist

            tasks.append(
                _push_list_item_to_plex_watchlist(
                    db, user_id, media, season_number=season_number, remove=True
                )
            )

    if lst and lst.mdblist_slug and media:
        from backend.routers.lists import _push_list_item_to_mdblist

        tasks.append(
            _push_list_item_to_mdblist(
                db, user_id, lst.mdblist_slug, media, season_number=season_number, remove=True
            )
        )

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
