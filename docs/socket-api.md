# Scrob WebSocket API

Real-time event streaming for Scrob instances via WebSocket. Connect external scripts, automations, or other Scrob instances to receive and emit events as they happen.

## Table of Contents

- [Overview](#overview)
- [Connection](#connection)
- [Authentication](#authentication)
- [Message Format](#message-format)
- [Channels](#channels)
- [Event Types](#event-types)
- [Sending Events (POST /socket/events)](#sending-events-post-socketevents)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The WebSocket API provides real-time synchronization of events between Scrob instances and external clients. It is **not** a replacement for the REST API — REST remains the source of truth; the socket carries apply-able deltas for real-time updates (see [ADR-001](architecture/ADR-001-scrob-socket-delta.md)). Bootstrap, wizard, reconnect, and periodic reconcile stay REST-only.

**Use cases:**
- Scripts / automation (history updates, progress sync)
- Multi-instance Scrob synchronization
- Integrations needing real-time events (instead of polling)

**Not used for:**
- The Astro frontend (uses REST + reactivity)
- Bulk history synchronization (uses REST + background jobs)

---

## Connection

### External Mode (itty.ws relay)

```
wss://itty.ws/c/{namespace}:{channel}?joinKey={join_key}&sendKey={send_key}
```

| Parameter | Required | Description |
|---|---|---|
| `namespace` | yes | Fixed prefix: `gwb-scrob` |
| `channel` | yes | `user-{username}` for personal events, `global` for system-wide |
| `joinKey` | no | Read key (obtained from [ittysockets.com](https://ittysockets.com)) |
| `sendKey` | no | Write key (obtained from [ittysockets.com](https://ittysockets.com)) |

### Internal Mode (self-hosted)

```
ws://{host}:{port}/c/{namespace}:{channel}?apiKey={api_key}
```

| Parameter | Required | Description |
|---|---|---|
| `host` | yes | Your Scrob server hostname |
| `port` | yes | `SOCKET_INTERNAL_PORT` (default `7332`) |
| `namespace` | yes | Fixed prefix: `gwb-scrob` |
| `channel` | yes | `user-{username}` or `global` |
| `apiKey` | yes | User's API key (query param, see below) |

---

## Authentication

### Both modes (API key)

Pass the user's API key as a query parameter:

```
wss://itty.ws/c/gwb-scrob:user-{username}?apiKey={api_key}
ws://{host}:7332/c/gwb-scrob:user-{username}?apiKey={api_key}
```

The server validates the key, resolves the `user_id`, and rejects missing/invalid credentials with close code `4001` (`"missing apiKey"` / `"invalid apiKey"`).

In internal mode the server subscribes the connection to `user-{username}` and fans out matching events over that channel. In external mode the `itty.ws` relay delivers them.

### External mode only (joinKey / sendKey)

Keys are obtained when creating a namespace on [ittysockets.com](https://ittysockets.com) and configured in the Scrob admin panel (**Settings → WebSocket**).

- `joinKey` — required to receive messages from the channel
- `sendKey` — required to send messages to the channel

> Never mix `joinKey`/`sendKey` with `apiKey` on one channel — separate auth domains.

---

## Message Format

All messages are JSON objects:

```json
{
  "type": "event_type",
  "op_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": { "op_id": "550e8400-e29b-41d4-a716-446655440000" },
  "timestamp": "2026-08-30T12:00:00Z"
}
```

| Field | Required | Description |
|---|---|---|
| `type` | yes | Event type (see [Event Types](#event-types)) |
| `payload` | yes | Event data |
| `timestamp` | no | ISO-8601 timestamp |
| `op_id` | no | Client operation id (string, 1–64 chars), top-level **and** inside `payload`; echoed back unchanged so the sender can filter its own echoes |

Send `{"type":"ping"}` to check liveness — the server replies `{"type":"pong"}`.

> **Note:** `user_id` is **not** included in the payload — it is derived from the API key at connection time.

---

## Channels

| Type | Name | Purpose |
|---|---|---|
| Personal | `gwb-scrob:user-{username}` | Events for a specific user |
| Global | `gwb-scrob:global` | System-wide notifications (rare) |

**Multi-instance:** Multiple clients connect with the same `username` + `apiKey` — all receive the same events.

---

## Event Types

### WatchEvent

| Event | Description |
|---|---|
| `watch_event.created` | New watch/history entry |
| `watch_event.updated` | Watch entry updated (progress) |
| `watch_event.deleted` | Watch entry deleted |

```json
{
  "type": "watch_event.created",
  "payload": {
    "id": 789,
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception",
    "watched_at": "2026-08-30T12:00:00Z",
    "completed": true,
    "progress_percent": 1.0,
    "play_count": 1
  }
}
```

### PlaybackSession

| Event | Description |
|---|---|
| `playback_session.started` | Playback started |
| `playback_session.updated` | Progress updated |
| `playback_session.paused` | Playback paused |
| `playback_session.resumed` | Playback resumed |
| `playback_session.stopped` | Playback stopped |
| `playback_session.completed` | Playback completed (watched) |

```json
{
  "type": "playback_session.started",
  "payload": {
    "session_key": "manual-123-456",
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception",
    "state": "playing",
    "progress_percent": 0.0,
    "progress_seconds": 0,
    "source": "manual"
  }
}
```

### List

| Event | Description |
|---|---|
| `list.created` | List created |
| `list.updated` | List updated (name, description) |
| `list.deleted` | List deleted |
| `list.item_added` | Item added to list |
| `list.item_removed` | Item removed from list |

```json
{
  "type": "list.item_added",
  "payload": {
    "list_id": 10,
    "list_name": "Watchlist",
    "item_id": 99,
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception",
    "poster_path": "https://image.tmdb.org/t/p/w500/xyz.jpg",
    "backdrop_path": "https://image.tmdb.org/t/p/w1280/abc.jpg",
    "release_date": "2010-07-16"
  }
}
```

```json
{
  "type": "list.item_removed",
  "payload": {
    "list_id": 10,
    "list_name": "Watchlist",
    "item_id": 99,
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception",
    "poster_path": "https://image.tmdb.org/t/p/w500/xyz.jpg",
    "backdrop_path": "https://image.tmdb.org/t/p/w1280/abc.jpg",
    "release_date": "2010-07-16"
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `list_id` | int | Target list |
| `list_name` | string \| null | Display name |
| `item_id` | int | `ListItem.id` — use for delete-without-GET |
| `media_id` | int \| null | Internal id |
| `media_tmdb_id` | int \| null | TMDB id |
| `media_type` | `movie` / `series` / `person` \| null | |
| `media_title` | string \| null | |
| `poster_path` | string \| null | Full URL — present on both REST-write and socket-ingest broadcasts |
| `backdrop_path` | string \| null | Full URL — present on both REST-write and socket-ingest broadcasts |
| `release_date` | string \| null | `YYYY-MM-DD` — present on both paths |

### Collection

| Event | Description |
|---|---|
| `collection.added` | Added to collection |
| `collection.removed` | Removed from collection |

```json
{
  "type": "collection.added",
  "payload": {
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception",
    "source": "plex"
  }
}
```

### Rating

| Event | Description |
|---|---|
| `rating.created` | Rating created |
| `rating.updated` | Rating updated |
| `rating.deleted` | Rating deleted |

```json
{
  "type": "rating.created",
  "payload": {
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception",
    "rating": 8.5
  }
}
```

### Drop

| Event | Description |
|---|---|
| `show.dropped` | Show added to dropped (excluded from Next Up, Calendar, Discover) |
| `show.undropped` | Show removed from dropped |
| `movie.dropped` | Movie added to dropped (excluded from Continue Watching, Discover) |
| `movie.undropped` | Movie removed from dropped |

```json
{
  "type": "show.dropped",
  "payload": {
    "show_id": 123,
    "tmdb_id": 456,
    "title": "Breaking Bad"
  }
}
```

```json
{
  "type": "movie.dropped",
  "payload": {
    "media_id": 789,
    "tmdb_id": 12345,
    "title": "Inception"
  }
}
```

---

## Sending Events (POST /socket/events)

`POST /socket/events` with API-key auth, body `{type, payload}`. Supported types: `watch_event.*`, `playback_session.*`, `list.item_added` / `list.item_removed`, `collection.*`, `rating.*`.

List payload variants:

```json
{ "list_id": 10, "media_id": 456 }
{ "list_id": 10, "tmdb_id": 12345, "media_type": "movie" }
{ "list_id": 10, "tmdb_id": 12345, "media_type": "series", "season_number": 2 }
{ "list_id": 10, "item_id": 99 }
```

- `media_id` wins when present; otherwise `tmdb_id` + `media_type` are resolved (TMDB lookup + create, mirroring `POST /lists/{id}/items`).
- `{list_id, item_id}` is valid for `list.item_removed` (delete without resolving media).
- After ingest the server fans the event out on `user-{username}`.
- `op_id` (optional, string 1–64 chars): pass as top-level request field or inside `payload` (top-level wins). Forwarded to the broadcast (top-level + payload) and echoed in the HTTP response. Non-string / empty / >64-char values are ignored.

| Status | When |
|---|---|
| `400` | Missing `list_id`; neither `media_id`/`item_id` nor `tmdb_id`+`media_type`; unknown `media_type`; `season_number` on non-series; unknown event type |
| `404` | List not found; item not found in list; media/TMDB-season unresolvable |
| `409` | `item_added` duplicate (`list_id` + `media_id` + season) |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Connection lost | Auto-reconnect with exponential backoff (1s, 2s, 4s, ... 30s) |
| Invalid message | Logged, message discarded |
| Invalid API key | Connection rejected (close code `4001`) |
| Send timeout | Retry once, then log |

### Connection lifecycle

```
disconnect → connecting → connected
                │            │
                │            ▼
                │       reconnecting
                │       (exponential backoff)
                └───────────┘
```

---

## Examples

### Python

See [`examples/socket_client.py`](../examples/socket_client.py) for a full reusable client.

```python
import asyncio
from examples.socket_client import ScrobSocketClient

async def main():
    client = ScrobSocketClient(
        username="johndoe",
        api_key="your-api-key",
    )

    def on_event(msg):
        print(f"Event: {msg['type']} — {msg['payload']}")

    await client.connect()
    await client.listen(on_event)

asyncio.run(main())
```

### Node.js

See [`examples/socket_client.js`](../examples/socket_client.js) for a full reusable client.

```js
import { ScrobSocketClient } from './examples/socket_client.js';

const client = new ScrobSocketClient({
  username: 'johndoe',
  apiKey: 'your-api-key',
});

client.onMessage((msg) => {
  console.log(`Event: ${msg.type} —`, msg.payload);
});

await client.connect();
```

### Command line (wscat)

```bash
wscat -c "wss://itty.ws/c/gwb-scrob:user-johndoe?apiKey=your-api-key"
> {"type":"watch_event.created","payload":{"media_id":456,"completed":true}}
```
