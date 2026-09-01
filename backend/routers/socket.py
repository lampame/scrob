"""Socket events endpoint for receiving real-time events from external clients."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db import get_db
from dependencies import get_current_user_or_api_key
from models.users import User
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


async def _handle_list_event(user: User, event_type: str, payload: dict, db: AsyncSession):
    """Handle list.item_added/removed."""
    list_id = payload.get("list_id")
    media_id = payload.get("media_id")
    if not list_id or not media_id:
        raise HTTPException(status_code=400, detail="list_id and media_id required")

    result = await db.execute(
        select(UserList).where(UserList.id == list_id, UserList.user_id == user.id)
    )
    user_list = result.scalar_one_or_none()
    if not user_list:
        raise HTTPException(status_code=404, detail="List not found")

    if event_type == "list.item_added":
        existing = await db.execute(
            select(ListItem).where(ListItem.list_id == list_id, ListItem.media_id == media_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Item already in list")
        item = ListItem(list_id=list_id, media_id=media_id)
        db.add(item)
    elif event_type == "list.item_removed":
        result = await db.execute(
            select(ListItem).where(ListItem.list_id == list_id, ListItem.media_id == media_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in list")
        await db.delete(item)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event_type}")

    await db.commit()
    return {"status": "ok", "list_id": list_id, "media_id": media_id}


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

    result = await handler(current_user, event.type, event.payload, db)
    return result
