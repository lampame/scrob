// Scrob sync — manual mapping storage.
// Maps arbitrary Scrob lists to Lampa favorite categories.
// Storage key: scrob_sync_map_{profile_id}
// Structure: { "wath": { "list_id": 5, "list_name": "Test" } }

import { KEYS } from '../storage'

// Get the storage key for the active profile's mapping
function mapKey() {
    var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default'
    return 'scrob_sync_map_' + pid
}

// Broken mappings storage key
function brokenKey() {
    var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default'
    return 'scrob_sync_broken_' + pid
}

// Parse stored map from storage
function parseMap(raw) {
    if (!raw || raw === 'none') return {}
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch (e) { return {} }
    }
    return raw
}

// Parse stored broken array from storage
function parseBroken(raw) {
    if (!raw || raw === 'none') return []
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch (e) { return [] }
    }
    return Array.isArray(raw) ? raw : []
}

// Get the full mapping object
export function getMap() {
    return parseMap(Lampa.Storage.get(mapKey(), 'none'))
}

// Save the full mapping object
function saveMap(map) {
    Lampa.Storage.set(mapKey(), map)
}

// Set a mapping: lampaKey → { list_id, list_name }
// Returns true on success, false if list_id already mapped to another category
export function setMapping(lampaKey, listId, listName) {
    var map = getMap()

    // Exclusivity check: list_id must not be mapped to another category
    var keys = Object.keys(map)
    for (var i = 0; i < keys.length; i++) {
        if (keys[i] !== lampaKey && map[keys[i]].list_id == listId) {
            return false
        }
    }

    map[lampaKey] = { list_id: listId, list_name: listName }
    saveMap(map)

    // Clear broken flag for this key if it was previously broken
    var broken = getBroken()
    var idx = broken.indexOf(lampaKey)
    if (idx !== -1) {
        broken.splice(idx, 1)
        saveBroken(broken)
    }

    return true
}

// Remove a mapping for a lampaKey
export function removeMapping(lampaKey) {
    var map = getMap()
    delete map[lampaKey]
    saveMap(map)
}

// Find the lampaKey for a given list_id (reverse lookup by mapping)
// Returns lampaKey or null
export function getMappingForList(listId) {
    var map = getMap()
    var keys = Object.keys(map)
    for (var i = 0; i < keys.length; i++) {
        if (map[keys[i]].list_id == listId) return keys[i]
    }
    return null
}

// Check if a list_id has an active mapping
export function isMappedList(listId) {
    return getMappingForList(listId) !== null
}

// Get all mapped list_ids
export function getMappedIds() {
    var map = getMap()
    var ids = []
    var keys = Object.keys(map)
    for (var i = 0; i < keys.length; i++) {
        ids.push(map[keys[i]].list_id)
    }
    return ids
}

// Get broken mappings array
function getBroken() {
    return parseBroken(Lampa.Storage.get(brokenKey(), 'none'))
}

// Save broken mappings array
function saveBroken(broken) {
    Lampa.Storage.set(brokenKey(), broken)
}

// Mark a mapping as broken (list deleted on server)
export function markBroken(lampaKey) {
    var broken = getBroken()
    if (broken.indexOf(lampaKey) === -1) {
        broken.push(lampaKey)
        saveBroken(broken)
    }
}

// Clear broken flag for a key
export function clearBroken(lampaKey) {
    var broken = getBroken()
    var idx = broken.indexOf(lampaKey)
    if (idx !== -1) {
        broken.splice(idx, 1)
        saveBroken(broken)
    }
}

// Get the list of broken keys
export function getBrokenKeys() {
    return getBroken()
}

// Get mapping entry for a lampaKey (returns { list_id, list_name } or undefined)
export function getMapping(lampaKey) {
    var map = getMap()
    return map[lampaKey]
}
