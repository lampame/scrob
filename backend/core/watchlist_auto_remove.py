"""Auto-remove watched titles from user's selected watchlist."""

import asyncio
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.lists import List, ListItem
from models.media import Media
from models.show import Show
from models.users import UserSettings

logger = logging.getLogger(__name__)


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
        logger.debug("Auto-remove disabled for user %s (no watchlist_auto_remove_id)", user_id)
        return  # Auto-remove disabled

    # 2. Find the list item (by media_id for movies, or by show_id for series)
    result = await db.execute(
        select(ListItem)
        .options(selectinload(ListItem.media), selectinload(ListItem.list))
        .join(List, List.id == ListItem.list_id)
        .where(
            ListItem.list_id == list_id,
            ListItem.media_id == media_id,
            List.user_id == user_id,  # Security: ensure ownership
        )
    )
    item = result.scalar_one_or_none()

    # For series: if not found by episode media_id, find the show's Media record
    if item is None:
        # Get the episode's show_id (references shows.id)
        media_result = await db.execute(
            select(Media.show_id).where(Media.id == media_id)
        )
        episode_show_id: Optional[int] = media_result.scalar_one_or_none()

        if episode_show_id is not None:
            # Get the show's tmdb_id
            show_result = await db.execute(
                select(Show.tmdb_id).where(Show.id == episode_show_id)
            )
            show_tmdb_id: Optional[int] = show_result.scalar_one_or_none()

            if show_tmdb_id is not None:
                # Find the Media record for the show (media_type='series')
                show_media_result = await db.execute(
                    select(Media.id).where(
                        Media.tmdb_id == show_tmdb_id,
                        Media.media_type == "series",
                    )
                )
                show_media_id: Optional[int] = show_media_result.scalar_one_or_none()

                if show_media_id is not None:
                    result = await db.execute(
                        select(ListItem)
                        .options(selectinload(ListItem.media), selectinload(ListItem.list))
                        .join(List, List.id == ListItem.list_id)
                        .where(
                            ListItem.list_id == list_id,
                            ListItem.media_id == show_media_id,
                            List.user_id == user_id,
                        )
                    )
                    item = result.scalar_one_or_none()

    if item is None:
        logger.debug(
            "Title %s not found in watchlist %s for user %s",
            media_id, list_id, user_id,
        )
        return  # Title not in watchlist

    # 3. Capture data before delete
    lst = item.list if hasattr(item, "list") else None
    media = item.media
    season_number = item.season_number

    logger.info(
        "Auto-removing %s from watchlist %s for user %s",
        media.title if media else media_id, list_id, user_id,
    )

    # 4. Delete the item
    await db.delete(item)
    await db.flush()

    # 5. Emit socket event
    from core.socket.manager import socket_manager
    from models.users import User

    user_result = await db.execute(select(User.username).where(User.id == user_id))
    username = user_result.scalar_one_or_none() or str(user_id)

    await socket_manager.emit(
        username=username,
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
        from routers.lists import _push_list_item_to_trakt

        tasks.append(
            _push_list_item_to_trakt(
                db, user_id, lst.trakt_slug, media, season_number=season_number, remove=True
            )
        )
        if lst.trakt_slug == "__plex_watchlist__":
            from routers.lists import _push_list_item_to_plex_watchlist

            tasks.append(
                _push_list_item_to_plex_watchlist(
                    db, user_id, media, season_number=season_number, remove=True
                )
            )

    if lst and lst.mdblist_slug and media:
        from routers.lists import _push_list_item_to_mdblist

        tasks.append(
            _push_list_item_to_mdblist(
                db, user_id, lst.mdblist_slug, media, season_number=season_number, remove=True
            )
        )

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
