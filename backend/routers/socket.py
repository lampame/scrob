"""Socket events endpoint for receiving real-time events from external clients."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from db import get_db
from dependencies import get_current_user_or_api_key
from models.users import User
from models.base import MediaType
from models.media import Media
from models.events import WatchEvent
from models.playback_session import PlaybackSession
from models.lists import List as UserList, ListItem
from models.collection import Collection
from models.ratings import Rating

logger = logging.getLogger(__name__)

router = APIRouter()


class SocketEventRequest(BaseModel):
    type: str
    payload: dict
    op_id: Optional[str] = None


# --- Event handlers ---


async def _handle_watch_event(user: User, payload: dict, db: AsyncSession):
    """Handle watch_event.created/updated/deleted."""
    media_id = payload.get("media_id")
    if not media_id:
        raise HTTPException(status_code=400, detail="media_id required")

    event = WatchEvent(
        user_id=user.id,
        media_id=media_id,
        watched_at=datetime.fromisoformat(payload["watched_at"]) if payload.get("watched_at") else datetime.now(timezone.utc),
        progress_seconds=payload.get("progress_seconds"),
        progress_percent=payload.get("progress_percent"),
        completed=payload.get("completed", False),
        play_count=payload.get("play_count", 1),
    )
    db.add(event)
    await db.commit()

    # Auto-remove from watchlist if completed
    if event.completed:
        from core.watchlist_auto_remove import auto_remove_from_watchlist

        await auto_remove_from_watchlist(db, user.id, media_id)

    return {"status": "created", "id": event.id}


async def _handle_playback_session(user: User, event_type: str, payload: dict, db: AsyncSession):
    """Handle playback_session.started/updated/stopped."""
    session_key = payload.get("session_key")
    if not session_key:
        raise HTTPException(status_code=400, detail="session_key required")

    result = await db.execute(
        select(PlaybackSession).where(PlaybackSession.session_key == session_key)
    )
    session = result.scalar_one_or_none()

    if event_type == "playback_session.started":
        if session:
            raise HTTPException(status_code=409, detail="Session already exists")
        session = PlaybackSession(
            user_id=user.id,
            media_id=payload["media_id"],
            session_key=session_key,
            source=payload.get("source", "manual"),
            state="playing",
            progress_percent=payload.get("progress_percent", 0.0),
            progress_seconds=payload.get("progress_seconds", 0),
        )
        db.add(session)
    elif event_type in ("playback_session.updated", "playback_session.paused", "playback_session.resumed"):
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if payload.get("progress_percent") is not None:
            session.progress_percent = payload["progress_percent"]
        if payload.get("progress_seconds") is not None:
            session.progress_seconds = payload["progress_seconds"]
        if event_type == "playback_session.paused":
            session.state = "paused"
        elif event_type == "playback_session.resumed":
            session.state = "playing"
    elif event_type in ("playback_session.stopped", "playback_session.completed"):
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session.state = "stopped"
        if payload.get("progress_percent") is not None:
            session.progress_percent = payload["progress_percent"]
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event_type}")

    await db.commit()
    return {"status": "ok", "session_key": session_key}


async def _resolve_list_media(user: User, payload: dict, db: AsyncSession):
    """Resolve media_id from payload: legacy media_id or tmdb_id+media_type (TMDB fallback)."""
    media_id = payload.get("media_id")
    if media_id:
        return media_id, payload.get("season_number")
    tmdb_id = payload.get("tmdb_id")
    media_type = payload.get("media_type")
    if tmdb_id is None or media_type is None:
        raise HTTPException(status_code=400, detail="media_id or tmdb_id+media_type required")
    try:
        media_type = MediaType(media_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid media_type: {payload.get('media_type')}")
    season_number = payload.get("season_number")
    if season_number is not None and media_type != MediaType.series:
        raise HTTPException(status_code=400, detail="season_number is only valid for media_type=series")

    result = await db.execute(
        select(Media).where(Media.tmdb_id == tmdb_id, Media.media_type == media_type).order_by(Media.id)
    )
    media = result.scalars().first()
    if media is None:
        # Mirror of add_list_item in routers/lists.py
        from routers.media import get_user_tmdb_key
        from core import tmdb
        from core.enrichment import create_media_safely

        api_key = await get_user_tmdb_key(db, user.id)
        try:
            if media_type == MediaType.movie:
                data = await tmdb.get_movie(tmdb_id, api_key=api_key)
                media, _ = await create_media_safely(
                    db, tmdb_id, MediaType.movie,
                    title=data.get("title", "Unknown"),
                    poster_path=tmdb.poster_url(data.get("poster_path")),
                    backdrop_path=tmdb.poster_url(data.get("backdrop_path"), size="w1280"),
                    release_date=data.get("release_date"),
                    tmdb_rating=data.get("vote_average"),
                    overview=data.get("overview"),
                    adult=data.get("adult", False),
                )
            elif media_type == MediaType.person:
                data = await tmdb.get_person(tmdb_id, api_key=api_key)
                media, _ = await create_media_safely(
                    db, tmdb_id, MediaType.person,
                    title=data.get("name", "Unknown"),
                    poster_path=tmdb.poster_url(data.get("profile_path"), size="w185"),
                    overview=data.get("biography"),
                )
            else:
                data = await tmdb.get_show(tmdb_id, api_key=api_key)
                media, _ = await create_media_safely(
                    db, tmdb_id, MediaType.series,
                    title=data.get("name", "Unknown"),
                    poster_path=tmdb.poster_url(data.get("poster_path")),
                    backdrop_path=tmdb.poster_url(data.get("backdrop_path"), size="w1280"),
                    release_date=data.get("first_air_date"),
                    tmdb_rating=data.get("vote_average"),
                    overview=data.get("overview"),
                    adult=data.get("adult", False),
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Media not found: {e}")
    if season_number is not None:
        from routers.media import get_user_tmdb_key
        from core import tmdb

        api_key = await get_user_tmdb_key(db, user.id)
        try:
            await tmdb.get_season(tmdb_id, season_number, api_key=api_key)
        except Exception:
            raise HTTPException(status_code=404, detail="Season not found")
    return media.id, season_number


async def _handle_list_event(user: User, event_type: str, payload: dict, db: AsyncSession, op_id: Optional[str] = None):
    """Handle list.item_added/removed.

    Accepts {list_id, media_id} (legacy), {list_id, tmdb_id, media_type[, season_number]},
    or {list_id, item_id} for removal.
    """
    list_id = payload.get("list_id")
    if not list_id:
        raise HTTPException(status_code=400, detail="list_id required")

    result = await db.execute(
        select(UserList).where(UserList.id == list_id, UserList.user_id == user.id)
    )
    user_list = result.scalar_one_or_none()
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")

    season_key = func.coalesce(ListItem.season_number, -1)

    if event_type == "list.item_added":
        media_id, season_number = await _resolve_list_media(user, payload, db)
        existing = await db.execute(
            select(ListItem).where(
                ListItem.list_id == list_id,
                ListItem.media_id == media_id,
                season_key == (season_number if season_number is not None else -1),
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Item already in list")
        item = ListItem(list_id=list_id, media_id=media_id, season_number=season_number)
        db.add(item)
        await db.flush()
        item_id = item.id
        await db.commit()
    elif event_type == "list.item_removed":
        item_id = payload.get("item_id")
        if item_id is not None:
            result = await db.execute(
                select(ListItem).where(ListItem.id == item_id, ListItem.list_id == list_id)
            )
            item = result.scalar_one_or_none()
        else:
            media_id, season_number = await _resolve_list_media(user, payload, db)
            result = await db.execute(
                select(ListItem).where(
                    ListItem.list_id == list_id,
                    ListItem.media_id == media_id,
                    season_key == (season_number if season_number is not None else -1),
                )
            )
            item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in list")
        media_id = item.media_id
        item_id = item.id
        await db.delete(item)
        await db.commit()
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event_type}")

    media_result = await db.execute(select(Media).where(Media.id == media_id))
    media = media_result.scalar_one_or_none()
    try:
        from core.socket.manager import socket_manager

        await socket_manager.emit(
            username=user.username,
            event_type=event_type,
            payload={
                "list_id": list_id,
                "list_name": user_list.name if user_list else None,
                "item_id": item_id,
                "media_id": media.id if media else media_id,
                "media_tmdb_id": media.tmdb_id if media else None,
                "media_type": media.media_type if media else None,
                "media_title": media.title if media else None,
                "poster_path": getattr(media, "poster_path", None) if media else None,
                "backdrop_path": getattr(media, "backdrop_path", None) if media else None,
                "release_date": getattr(media, "release_date", None) if media else None,
            },
            op_id=op_id,
        )
    except Exception:
        logger.warning("socket emit failed", exc_info=True)

    result = {"status": "ok", "list_id": list_id, "media_id": media_id, "item_id": item_id}
    if op_id is not None:
        result["op_id"] = op_id
    return result


async def _handle_collection_event(user: User, event_type: str, payload: dict, db: AsyncSession):
    """Handle collection.added/removed."""
    media_id = payload.get("media_id")
    if not media_id:
        raise HTTPException(status_code=400, detail="media_id required")

    if event_type == "collection.added":
        existing = await db.execute(
            select(Collection).where(Collection.user_id == user.id, Collection.media_id == media_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Already in collection")
        collection = Collection(user_id=user.id, media_id=media_id)
        db.add(collection)
    elif event_type == "collection.removed":
        result = await db.execute(
            select(Collection).where(Collection.user_id == user.id, Collection.media_id == media_id)
        )
        collection = result.scalar_one_or_none()
        if not collection:
            raise HTTPException(status_code=404, detail="Not in collection")
        await db.delete(collection)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event_type}")

    await db.commit()
    return {"status": "ok", "media_id": media_id}


async def _handle_rating_event(user: User, event_type: str, payload: dict, db: AsyncSession):
    """Handle rating.created/updated/deleted."""
    media_id = payload.get("media_id")
    if not media_id:
        raise HTTPException(status_code=400, detail="media_id required")

    if event_type in ("rating.created", "rating.updated"):
        result = await db.execute(
            select(Rating).where(Rating.user_id == user.id, Rating.media_id == media_id)
        )
        rating = result.scalar_one_or_none()
        if rating:
            rating.rating = payload.get("rating")
            rating.review = payload.get("review")
        else:
            rating = Rating(
                user_id=user.id,
                media_id=media_id,
                rating=payload.get("rating"),
                review=payload.get("review"),
            )
            db.add(rating)
    elif event_type == "rating.deleted":
        result = await db.execute(
            select(Rating).where(Rating.user_id == user.id, Rating.media_id == media_id)
        )
        rating = result.scalar_one_or_none()
        if not rating:
            raise HTTPException(status_code=404, detail="Rating not found")
        await db.delete(rating)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event_type}")

    await db.commit()
    return {"status": "ok", "media_id": media_id}


# --- Router ---

_EVENT_HANDLERS = {
    "watch_event.created": _handle_watch_event,
    "watch_event.updated": _handle_watch_event,
    "playback_session.started": _handle_playback_session,
    "playback_session.updated": _handle_playback_session,
    "playback_session.paused": _handle_playback_session,
    "playback_session.resumed": _handle_playback_session,
    "playback_session.stopped": _handle_playback_session,
    "playback_session.completed": _handle_playback_session,
    "list.item_added": _handle_list_event,
    "list.item_removed": _handle_list_event,
    "collection.added": _handle_collection_event,
    "collection.removed": _handle_collection_event,
    "rating.created": _handle_rating_event,
    "rating.updated": _handle_rating_event,
    "rating.deleted": _handle_rating_event,
}


@router.post("/socket/events")
async def receive_event(
    event: SocketEventRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_or_api_key),
):
    """Receive events from external clients via API key auth."""
    handler = _EVENT_HANDLERS.get(event.type)
    if not handler:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown event type: {event.type}. Supported: {list(_EVENT_HANDLERS.keys())}",
        )

    if event.type in ("list.item_added", "list.item_removed"):
        op_id = event.op_id or (event.payload.get("op_id") if isinstance(event.payload, dict) else None)
        result = await handler(current_user, event.type, event.payload, db, op_id=op_id)
    else:
        result = await handler(current_user, event.type, event.payload, db)
    return result
