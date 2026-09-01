# Scrob WebSocket API

Real-time event streaming for Scrob instances via WebSocket. Connect external scripts, automations, or other Scrob instances to receive and emit events as they happen.

## Table of Contents

- [Overview](#overview)
- [Connection](#connection)
- [Authentication](#authentication)
- [Message Format](#message-format)
- [Channels](#channels)
- [Event Types](#event-types)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The WebSocket API provides real-time synchronization of events between Scrob instances and external clients. It is **not** a replacement for the REST API — REST remains the source of truth; the socket is a notification layer for real-time updates.

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
ws://{host}:{port}/c/{namespace}:{channel}
```

| Parameter | Required | Description |
|---|---|---|
| `host` | yes | Your Scrob server hostname |
| `port` | yes | `SOCKET_INTERNAL_PORT` (default `7332`) |
| `namespace` | yes | Fixed prefix: `gwb-scrob` |
| `channel` | yes | `user-{username}` or `global` |

---

## Authentication

### External mode (API key)

Pass the user's API key as a query parameter:

```
wss://itty.ws/c/gwb-scrob:user-{username}?apiKey={api_key}
```

The server validates the key, resolves the `user_id`, and rejects mismatched credentials with close code `4001`.

### Internal mode (joinKey / sendKey)

Keys are obtained when creating a namespace on [ittysockets.com](https://ittysockets.com) and configured in the Scrob admin panel (**Settings → WebSocket**).

- `joinKey` — required to receive messages from the channel
- `sendKey` — required to send messages to the channel

---

## Message Format

All messages are JSON objects:

```json
{
  "type": "event_type",
  "payload": { ... },
  "timestamp": "2026-08-30T12:00:00Z"
}
```

| Field | Required | Description |
|---|---|---|
| `type` | yes | Event type (see [Event Types](#event-types)) |
| `payload` | yes | Event data |
| `timestamp` | no | ISO-8601 timestamp |

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
    "media_id": 456,
    "media_tmdb_id": 12345,
    "media_type": "movie",
    "media_title": "Inception"
  }
}
```

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
