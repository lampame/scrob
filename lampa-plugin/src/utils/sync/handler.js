// Scrob sync — socket notification hub.
// Socket is inbound-only: every event only invalidates state and calls engine.update().
// No direct writes to Lampa.Storage here (mirrors src/core/socket.js: inbound
// 'bookmarks' only triggers Account.Bookmarks.update()).

// Registered update callback from the engine (set via bindUpdate)
var updateFn = null

// Named handlers: stable references so off() actually unregisters (unlike
// anonymous closures, which silently leak and double-fire after restarts).
function onItemAdded(payload) { requestUpdate('list.item_added') }
function onItemRemoved(payload) { requestUpdate('list.item_removed') }
function onListCreated(payload) { requestUpdate('list.created') }
function onListUpdated(payload) { requestUpdate('list.updated') }
function onListDeleted(payload) { requestUpdate('list.deleted') }
function onWatchEvent(payload) { requestUpdate('watch_event.created') }
function onPlaybackCompleted(payload) { requestUpdate('playback_session.completed') }

// Bind the engine update() entry point. Called once from engine.start().
export function bindUpdate(fn) {
    updateFn = fn
}

// Single notification path: ask the engine to refetch and converge.
export function requestUpdate(reason) {
    if (typeof updateFn === 'function') updateFn(reason || 'socket')
}

// ─── Public API ───────────────────────────────────────────

// Register invalidation handlers on the socket.
// Every event funnels into requestUpdate — no Storage writes here.
export function registerHandlers(socket) {
    socket.on('list.item_added', onItemAdded)
    socket.on('list.item_removed', onItemRemoved)
    socket.on('list.created', onListCreated)
    socket.on('list.updated', onListUpdated)
    socket.on('list.deleted', onListDeleted)
    socket.on('watch_event.created', onWatchEvent)
    socket.on('playback_session.completed', onPlaybackCompleted)
}

// Unregister invalidation handlers from the socket.
export function unregisterHandlers(socket) {
    socket.off('list.item_added', onItemAdded)
    socket.off('list.item_removed', onItemRemoved)
    socket.off('list.created', onListCreated)
    socket.off('list.updated', onListUpdated)
    socket.off('list.deleted', onListDeleted)
    socket.off('watch_event.created', onWatchEvent)
    socket.off('playback_session.completed', onPlaybackCompleted)
}
