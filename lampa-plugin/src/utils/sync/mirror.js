// Scrob sync — mirror storage.
// Per-profile mirror: scrob_sync_mirror_{profile_id}
// Structure: { lists: { "[Lampa] Name": { list_id, items: { "type:tmdb_id": item_id } } }, updated_at }

import { KEYS } from '../storage'
import { activeProfile } from '../profiles'

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
    mirror.updated_at = Date.now()
    Lampa.Storage.set(mirrorKey(), mirror)
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
