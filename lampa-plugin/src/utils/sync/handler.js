// WebSocket event handlers for Scrob sync.
// Receives real-time events from the server and applies them to local Lampa storage.

import { cardFromScrobMedia } from './mapping'
import * as mirror from './mirror'

// ─── Echo guard ───────────────────────────────────────────

// Counter: >0 when engine is applying local changes (skip inbound events)
var applying = 0

// Set echo guard state. Called by engine before outbound sync.
export function setApplying(value) {
    applying = value
}

// ─── Favorite storage helpers ─────────────────────────────

// Read favorite from storage, normalize from string if needed.
function readFavorite() {
    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
    }
    return favorite
}

// Save favorite to storage.
function saveFavorite(favorite) {
    Lampa.Storage.set('favorite', favorite)
}

// ─── List name mapping ────────────────────────────────────

// Map Scrob list name to Lampa favorite key.
function lampaKeyForListName(listName) {
    var map = {
        '[Lampa] Bookmarks': 'book',
        '[Lampa] Like': 'like',
        '[Lampa] Later': 'wath',
        '[Lampa] Scheduled': 'scheduled',
        '[Lampa] To be continued': 'continued',
        '[Lampa] Thrown': 'thrown',
        '[Lampa] Look': 'look'
    }
    return map[listName] || null
}

// ─── Event handlers ───────────────────────────────────────

// Resolve TMDB identity from emit payload (canonical schema: media_id wins,
// otherwise media_tmdb_id/tmdb_id + media_type). Returns { tmdbId, mediaType } or null.
function resolveTmdbIdentity(payload) {
    if (!payload) return null
    // Numeric internal media_id alone cannot map to TMDB — need TMDB pair
    var tmdbId = payload.media_tmdb_id || payload.tmdb_id || null
    var mediaType = payload.media_type || null
    if (tmdbId && mediaType) {
        return { tmdbId: parseInt(tmdbId, 10), mediaType: mediaType }
    }
    return null
}

// Resolve list name: mirror lookup by list_id first, legacy list_name fallback.
function resolveListName(payload) {
    if (payload.list_id) {
        var m = mirror.get()
        var names = Object.keys(m.lists)
        for (var i = 0; i < names.length; i++) {
            if (m.lists[names[i]].list_id == payload.list_id) return names[i]
        }
    }
    return payload.list_name || null
}

// Handle item added to a Scrob list.
function onListItemAdded(payload) {
    // Emit payload: { list_id, media_id + media_tmdb_id/media_type, ... } (+ legacy list_name)

    var listName = resolveListName(payload)
    if (!listName || listName.indexOf('[Lampa] ') !== 0) return

    var lampaKey = lampaKeyForListName(listName)
    if (!lampaKey) return

    if (applying > 0) return

    var identity = resolveTmdbIdentity(payload)
    if (!identity) return

    var favorite = readFavorite()
    var ids = Array.isArray(favorite[lampaKey]) ? favorite[lampaKey] : []
    var mediaId = identity.tmdbId

    if (ids.indexOf(mediaId) === -1) {
        ids.push(mediaId)
        favorite[lampaKey] = ids

        // Add card to pool if not exists
        var card = cardFromScrobMedia({
            tmdb_id: identity.tmdbId,
            type: identity.mediaType,
            title: payload.media_title
        })

        if (card) {
            var pool = Array.isArray(favorite.card) ? favorite.card : []
            var exists = pool.some(function (c) { return c.id === card.id })
            if (!exists) {
                pool.push(card)
                favorite.card = pool
            }
        }

        saveFavorite(favorite)
    }
}

// Handle item removed from a Scrob list.
function onListItemRemoved(payload) {
    // Emit payload: { list_id, media_id + media_tmdb_id/media_type, ... } (+ legacy list_name)

    var listName = resolveListName(payload)
    if (!listName || listName.indexOf('[Lampa] ') !== 0) return

    var lampaKey = lampaKeyForListName(listName)
    if (!lampaKey) return

    if (applying > 0) return

    var identity = resolveTmdbIdentity(payload)
    if (!identity) return

    var favorite = readFavorite()
    var ids = Array.isArray(favorite[lampaKey]) ? favorite[lampaKey] : []
    var mediaId = identity.tmdbId
    var idx = ids.indexOf(mediaId)

    if (idx !== -1) {
        ids.splice(idx, 1)
        favorite[lampaKey] = ids
        saveFavorite(favorite)
    }
}

// Handle new list created on Scrob.
// Only [Lampa] lists — usually echo, but could be from another device.
function onListCreated(payload) {
    // payload: { id, name, ... }

    if (!payload.name || payload.name.indexOf('[Lampa] ') !== 0) return

    if (applying > 0) return

    var m = mirror.get()
    if (!m.lists[payload.name]) {
        m.lists[payload.name] = { list_id: payload.id, items: {}, server_updated_at: Date.now() }
        mirror.save(m)
    }
}

// Handle new watch event (history).
function onWatchEventCreated(payload) {
    // Emit payload: { media_id + media_tmdb_id/media_type, watched_at, completed, ... }

    if (applying > 0) return

    var identity = resolveTmdbIdentity(payload)
    if (!identity) return

    var favorite = readFavorite()
    var mediaId = identity.tmdbId

    if (payload.completed) {
        // Mark as viewed
        var viewedIds = Array.isArray(favorite.viewed) ? favorite.viewed : []
        if (viewedIds.indexOf(mediaId) === -1) {
            viewedIds.push(mediaId)
            favorite.viewed = viewedIds
        }
    } else {
        // Add to history (not completed)
        var historyIds = Array.isArray(favorite.history) ? favorite.history : []
        if (historyIds.indexOf(mediaId) === -1) {
            historyIds.push(mediaId)
            favorite.history = historyIds
        }
    }

    saveFavorite(favorite)
}

// Handle playback session completed.
function onPlaybackCompleted(payload) {
    // Emit payload: { session_key, media_id + media_tmdb_id/media_type, ... }

    if (applying > 0) return

    var identity = resolveTmdbIdentity(payload)
    if (!identity) return

    var favorite = readFavorite()
    var mediaId = identity.tmdbId
    var viewedIds = Array.isArray(favorite.viewed) ? favorite.viewed : []

    if (viewedIds.indexOf(mediaId) === -1) {
        viewedIds.push(mediaId)
        favorite.viewed = viewedIds
        saveFavorite(favorite)
    }
}

// ─── Public API ───────────────────────────────────────────

// Register all event handlers on the socket.
export function registerHandlers(socket) {
    socket.on('list.item_added', onListItemAdded)
    socket.on('list.item_removed', onListItemRemoved)
    socket.on('list.created', onListCreated)
    socket.on('watch_event.created', onWatchEventCreated)
    socket.on('playback_session.completed', onPlaybackCompleted)
}

// Unregister all event handlers from the socket.
export function unregisterHandlers(socket) {
    socket.off('list.item_added', onListItemAdded)
    socket.off('list.item_removed', onListItemRemoved)
    socket.off('list.created', onListCreated)
    socket.off('watch_event.created', onWatchEventCreated)
    socket.off('playback_session.completed', onPlaybackCompleted)
}
