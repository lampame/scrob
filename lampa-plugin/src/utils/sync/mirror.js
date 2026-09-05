// Scrob sync — mirror storage with Tracker-model staleness.
// Per-profile mirror: scrob_sync_mirror_{profile_id}
// Structure: { lists: { "[Lampa] Name": { list_id, items: { "type:tmdb_id": item_id } } },
//              version, time, updated_at }
// version/time follow Lampa core Tracker (src/core/tracker.js): bumped on every
// converged save; profile switch resets them so the next update fetches fresh state.

import { KEYS } from '../storage'

// Get the storage key for the active profile's mirror
function mirrorKey() {
    var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default'
    return 'scrob_sync_mirror_' + pid
}

// Get the initial-done flag key for the active profile
export function initialDoneKey() {
    var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default'
    return 'scrob_sync_initial_done_' + pid
}

// Default mirror structure
function emptyMirror() {
    return {
        lists: {},
        version: 0,
        time: 0,
        updated_at: 0
    }
}

// Read the mirror from storage
export function get() {
    var raw = Lampa.Storage.get(mirrorKey(), 'none')
    if (raw === 'none' || !raw) return emptyMirror()
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw) } catch (e) { return emptyMirror() }
    }
    return raw
}

// Save the mirror to storage
export function save(mirror) {
    var now = Date.now()
    mirror.time = now
    mirror.version = (mirror.version || 0) + 1
    mirror.updated_at = now
    Lampa.Storage.set(mirrorKey(), mirror)
}

// Current tracker stamp: { version, time } (Tracker model from Lampa core)
export function tracker() {
    var m = get()
    return { version: m.version || 0, time: m.time || 0 }
}

// True when the mirror snapshot is older than the given age (ms)
export function isStale(maxAgeMs) {
    var m = get()
    return (Date.now() - (m.time || 0)) > maxAgeMs
}

// Reset the mirror to empty
export function reset() {
    Lampa.Storage.set(mirrorKey(), emptyMirror())
}

// Get a list entry by name (returns undefined if not found)
export function getList(name) {
    var m = get()
    return m.lists[name]
}

// Set a list entry by name
export function setList(name, listId) {
    var m = get()
    m.lists[name] = {
        list_id: listId,
        items: m.lists[name] ? m.lists[name].items : {}
    }
    save(m)
}

// Get item_id from mirror for a specific list and element key
export function getItemId(listName, elemKey) {
    var list = getList(listName)
    if (!list) return null
    return list.items[elemKey] || null
}

// Set item_id in mirror for a specific list and element key
export function setItemId(listName, elemKey, itemId) {
    var m = get()
    if (!m.lists[listName]) {
        m.lists[listName] = { list_id: null, items: {} }
    }
    m.lists[listName].items[elemKey] = itemId
    save(m)
}

// Remove item_id from mirror for a specific list and element key
export function removeItemId(listName, elemKey) {
    var m = get()
    if (m.lists[listName] && m.lists[listName].items) {
        delete m.lists[listName].items[elemKey]
        save(m)
    }
}

// Get all element keys for a list
export function getListElementKeys(listName) {
    var list = getList(listName)
    if (!list) return []
    return Object.keys(list.items)
}

// Check if initial sync has been done for the active profile
export function isInitialDone() {
    return !!Lampa.Storage.get(initialDoneKey())
}

// Mark initial sync as done
export function markInitialDone() {
    Lampa.Storage.set(initialDoneKey(), true)
}

// Clear initial done flag (for profile switch re-sync)
export function clearInitialDone() {
    Lampa.Storage.set(initialDoneKey(), false)
}
