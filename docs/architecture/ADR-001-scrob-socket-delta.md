# ADR-001: Socket Carries Apply-able Deltas, REST Remains Source of Truth

**Status:** Accepted
**Date:** 2026-09-06
**Scope:** list sync (`list.item_added` / `list.item_removed`) + `POST /socket/events` ingest + internal fan-out

## Context

Writes were REST-only. The socket was notify-and-refetch: every event
triggered a full `getLists` + `getListItems`, i.e. N extra GETs per event.
With the socket closed, clients polled.

Vision (see `develop-eggs/scrob_sync_v2.md`): REST is truth, socket carries
deltas. Steady-state clients apply payloads directly; bootstrap, wizard,
reconcile, and reconnect stay REST-only.

## Decision

1. **REST remains the source of truth.** All durable writes go through REST
   (`POST /lists/{id}/items`, `DELETE /lists/{id}/items/{item_id}`) or the
   ingest endpoint below. Socket messages never create truth by themselves.
2. **Socket carries apply-able deltas.** `list.item_added` / `list.item_removed`
   payloads include everything a client needs to update local state without
   refetch (see Payload contract).
3. **Bootstrap / wizard / reconcile stay REST-only.** Initial sync, retry,
   and self-heal never trust the socket.
4. **Steady-state uses deltas.** With an open socket, clients apply payloads;
   on unknown `list_id` or missing fields they fall back to one REST update.
5. **No socket-only mode.** `itty.ws` has no persistence, ordering, or ack —
   an interrupted connection loses events. Hence reconcile (below) is mandatory.

## Payload contract (`list.item_*`)

Emitted by `backend/routers/lists.py` on every REST write, and mirrored by
`POST /socket/events` after ingest.

| Field | Type | Present in | Notes |
|---|---|---|---|
| `list_id` | int | both | Target list |
| `list_name` | string \| null | both | Display name, may be null |
| `item_id` | int | both | `ListItem.id`. Required for delete-without-GET |
| `media_id` | int \| null | both | Internal id; null if media row missing |
| `media_tmdb_id` | int \| null | both | TMDB id for key resolution |
| `media_type` | `"movie"` \| `"series"` \| `"person"` \| null | both | Enum value as string |
| `media_title` | string \| null | both | Display title |
| `poster_path` | string \| null | both | Full URL; lets clients build cards without fetch |
| `backdrop_path` | string \| null | both | Full URL (`w1280` for movie/series) |
| `release_date` | string \| null | both | `YYYY-MM-DD` (movie) / `first_air_date` (series) |

## Ingest contract (`POST /socket/events`)

Auth: same as other API routes (`get_current_user_or_api_key`).

Supported `list.item_added` / `list.item_removed` payload variants:

| Variant | Fields | Use |
|---|---|---|
| legacy | `{list_id, media_id[, season_number]}` | Callers that know the internal id |
| tmdb | `{list_id, tmdb_id, media_type[, season_number]}` | Callers that only know TMDB (e.g. Lampa) |
| remove-by-item | `{list_id, item_id}` | `item_removed` without resolving media first |

Rules (`_resolve_list_media` mirrors `POST /lists/{id}/items`):

- `media_id` wins when present; otherwise `tmdb_id` + `media_type` required.
- Unknown `media_type` → `400`. `season_number` with non-`series` → `400`.
- Missing media row → TMDB lookup + create (same enrichment as REST write);
  unresolvable → `404`.
- `item_added` on duplicate (`list_id` + `media_id` + season) → `409`.
- `item_removed` on missing item or missing list → `404`.
- `season_number`, when valid, is validated against TMDB (`get_season`);
  unknown season → `404`.

## Internal fan-out design

`backend/core/socket/manager.py` + `backend/core/socket/server.py`:

- **Channels:** `user-{username}`, prefixed by namespace
  (`channel_for()` → `{namespace}:user-{username}`, default namespace
  `gwb-scrob`). `global` channel exists by convention, rarely used.
- **Subscribe:** each WS connection gets a bounded `asyncio.Queue(maxsize=100)`.
- **Emit:** `manager.emit()` builds `{type, payload, timestamp, channel}` and,
  in `internal` mode, `put_nowait()` to every subscriber queue on the channel.
  Best-effort: full queues are skipped, never raise. In `external` mode it
  forwards to the `itty.ws` client as before; `disabled` is a no-op.
- **Auth:** handshake path must carry `?apiKey=`; resolved via
  `get_user_from_api_key()`. Missing or invalid key → close `4001`
  (`"missing apiKey"` / `"invalid apiKey"`).
- **ping/pong:** client message `{"type":"ping"}` → server replies
  `{"type":"pong"}`. Invalid JSON is ignored, connection stays open.
- **Lifecycle:** relay task per connection; cancelled + unsubscribed on close.

Port stays `SOCKET_INTERNAL_PORT` default `7332` — no env change in this ADR.

## op_id echo contract + why

`op_id`: optional client-generated operation id (string, 1–64 chars).

- Sent as a **top-level** message field **and** inside `payload`
  (`{"type": ..., "op_id": "...", "payload": {"op_id": "...", ...}}`).
- Server echoes it back **unchanged** on the fanned-out event.
- Sender filters its own echoes by matching `op_id` instead of refetching;
  receivers ignore `op_id` and apply the delta normally.

Rationale: without it the sender cannot distinguish its own write echoing
back from a genuinely remote change, forcing a defensive refetch per event —
exactly the N+1 this ADR removes.

Implemented (`manager.emit(..., op_id)`, `SocketEventRequest.op_id`,
`_handle_list_event(..., op_id)`): top-level request field wins over
`payload.op_id`; non-string / empty / >64-char values ignored (no echo, no
error); caller payload dict never mutated; echoed in the HTTP response and on
the fanned-out message (top-level + payload). Currently wired for
`list.item_*` only — other handlers ignore `op_id`.

## Reconcile strategy

- **Reconnect → one REST update.** Any `open` after a break runs a single
  `update('reconnect')` (`getLists` + items), then resumes delta-apply.
- **Periodic reconcile.** `update()` every 5–15 min while connected, REST-only.
- **Socket closed → polling.** REST `pushQueue` for writes; polling +
  `update()` for reads until the socket reopens.
- **`409/404/broken` → REST reconcile.** Duplicate, missing item, or broken
  reference falls back to fetch/resolve/mark-broken, never silent drop.

## Non-goals

- `history` / `viewed` / card state stay out of socket sync (REST-only, as before).
- `joinKey` / `sendKey` (itty.ws ESPN keys) are never mixed with `apiKey`
  on one channel — separate auth domains, separate docs sections.
- No socket-only write path: no persistence / ordering / ack on the relay,
  so every socket write needs the REST fallback above.

## References

- Protocol: `../socket-api.md`
- Vision: `../../develop-eggs/scrob_sync_v2.md`
- Code: `../../backend/routers/lists.py` (emit payloads),
  `../../backend/routers/socket.py` (`_resolve_list_media`, `_handle_list_event`),
  `../../backend/core/socket/manager.py` (fan-out),
  `../../backend/core/socket/server.py` (auth, ping/pong)
