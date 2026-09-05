// Scrob sync engine — orchestrator for bidirectional list synchronization.
// Exports start/stop/detectConflicts. Settings registration is a separate task.

import * as api from '../api'
import { registerHandlers, unregisterHandlers, setApplying } from './handler'
import { KEYS, hasSession, serverUrl } from '../storage'
import { activeProfile } from '../profiles'
import {
    listNameForKey, syncableKeys, detectMediaType, toScrobType,
    toLampaMethod, elementKey, parseElementKey, cardFromScrobMedia,
    MARK_KEYS
} from './mapping'
import * as mirror from './mirror'
import * as mapstore from './mapstore'

// ─── State ────────────────────────────────────────────────

var applying = 0           // Echo guard counter
var outboundTimer = null   // Debounce timer for outbound diff
var pollTimer = null       // Polling interval timer
var retryQueue = []        // Failed outbound operations for retry
var retryTimer = null      // Retry interval timer
var running = false        // Engine active flag
var storageListener = null // Reference to Storage listener for cleanup
var profileListener = null // Reference to profile change listener
var brokenMappings = []    // Keys whose mapped list was deleted on server
var healing = false         // Self-heal guard: prevent re-entrant missing-key resolution
var activeSocket = null    // Current WebSocket instance

// Debounce window for batching outbound changes (ms)
var DEBOUNCE_MS = 500
var RETRY_DELAY = 5000
var RETRY_MAX = 3

// ─── Conflict detection ───────────────────────────────────

// Detect conflicts with other sync mechanisms.
// Returns an array of conflict objects: { type, reason }
export function detectConflicts() {
    var conflicts = []

    // CUB account with sync enabled (section 9)
    if (Lampa.Account && Lampa.Account.Permit && Lampa.Account.Permit.sync) {
        conflicts.push({
            type: 'cub_sync',
            reason: 'CUB synchronization is enabled — Scrob list sync is blocked'
        })
    }

    // GramSync/GramLink profile active (section 9)
    if (Lampa.Storage.get('gramsync_sync_enabled')) {
        conflicts.push({
            type: 'gramsync',
            reason: 'GramSync is enabled — simultaneous sync may cause data conflicts'
        })
    }

    return conflicts
}

// Check if sync should be blocked
function isBlocked() {
    var conflicts = detectConflicts()
    for (var i = 0; i < conflicts.length; i++) {
        if (conflicts[i].type === 'cub_sync') return true
    }
    return false
}

// ─── Socket integration ───────────────────────────────────

// Provide a WebSocket instance for real-time sync.
export function useSocket(socketInstance) {
    activeSocket = socketInstance
}

// Check if socket is currently connected and active.
// Relay client is inbound-only (emit subscriptions); writes go via POST /socket/events.
export function isSocketActive() {
    return activeSocket && activeSocket.isConnected()
}

// ─── List resolution ──────────────────────────────────────

// Resolve all syncable list names against Scrob server.
// Creates missing lists. Returns map: { listName: listId }
// Mapped keys use the mapped Scrob list; unmapped keys use [Lampa] lists.
function resolveLists(callback) {
    api.getLists(function (serverLists) {
        // Index server lists by name and by id for O(1) lookup
        var byName = {}
        var byId = {}
        for (var i = 0; i < serverLists.length; i++) {
            byName[serverLists[i].name] = serverLists[i]
            byId[serverLists[i].id] = serverLists[i]
        }

        // Read current favorite to get all syncable keys
        var favorite = Lampa.Storage.get('favorite', '{}')
        if (typeof favorite === 'string') {
            try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
        }

        var keys = syncableKeys(favorite)
        var resolved = {}
        var pending = 0
        brokenMappings = []

        function done() {
            callback(resolved)
        }

        function checkDone() {
            pending--
            if (pending <= 0) done()
        }

        // Resolve a canonical [Lampa] key: create list if missing
        function resolveDefaultKey(name) {
            if (byName[name]) {
                resolved[name] = byName[name].id
                mirror.setList(name, byName[name].id)
                checkDone()
            } else {
                pending++
                api.createList(name, function (created) {
                    resolved[name] = created.id
                    mirror.setList(name, created.id)
                    checkDone()
                }, function () {
                    checkDone()
                })
            }
        }

        if (keys.length === 0) {
            done()
        } else {
            for (var j = 0; j < keys.length; j++) {
                var key = keys[j]
                var mapping = mapstore.getMapping(key)

                if (mapping) {
                    // Mapped key: resolve by list_id (fallback by list_name)
                    var serverList = byId[mapping.list_id]
                    if (!serverList && mapping.list_name) {
                        serverList = byName[mapping.list_name]
                    }

                    if (serverList) {
                        resolved[key] = serverList.id
                        mirror.setList(mapping.list_name || listNameForKey(key), serverList.id)
                        checkDone()
                    } else {
                        // List not found on server — mark broken, skip
                        brokenMappings.push(key)
                        mapstore.markBroken(key)
                        checkDone()
                    }
                } else {
                    // Unmapped key: use default [Lampa] list
                    var name = listNameForKey(key)
                    if (name) {
                        pending++
                        resolveDefaultKey(name)
                    } else {
                        checkDone()
                    }
                }
            }

            // Also resolve any existing mirror lists (might have been added by other clients)
            var m = mirror.get()
            var mirrorNames = Object.keys(m.lists)
            for (var k = 0; k < mirrorNames.length; k++) {
                if (!resolved[mirrorNames[k]]) {
                    pending++
                    resolveDefaultKey(mirrorNames[k])
                }
            }
            if (pending === 0) done()
        }
    }, function () {
        console.warn('ScrobSync', 'getLists failed')
        callback({})
    })
}

// Ensure a single list exists on server, merge into mirror.
// Simplified one-shot resolution for self-heal in outboundDiff.
function ensureList(name, lampaKey, callback) {
    api.getLists(function (serverLists) {
        var byName = {}
        for (var i = 0; i < serverLists.length; i++) {
            byName[serverLists[i].name] = serverLists[i]
        }

        if (byName[name]) {
            mergePair(lampaKey, byName[name].id, name, callback)
        } else {
            api.createList(name, function (created) {
                mergePair(lampaKey, created.id, name, callback)
            }, callback)
        }
    }, callback)
}

// ─── Initial sync (section 7) ─────────────────────────────

function initialSync() {
    if (mirror.isInitialDone()) return
    if (!hasSession()) return

    console.log('ScrobSync', 'initial sync start')

    resolveLists(function (listMap) {
        var listNames = Object.keys(listMap)
        if (listNames.length === 0) {
            // If mirror is empty and this was a forced/first sync — report failure
            var m = mirror.get()
            if (Object.keys(m.lists).length === 0) {
                Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_lists_error'))
            } else {
                mirror.markInitialDone()
            }
            return
        }

        var favorite = Lampa.Storage.get('favorite', '{}')
        if (typeof favorite === 'string') {
            try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
        }
        if (!favorite.card) favorite.card = []

        var processed = 0
        var total = listNames.length

        function onListDone() {
            processed++
            if (processed >= total) {
                // Save one Storage.set('favorite') after all pulls
                applying++
                setApplying(applying)
                Lampa.Storage.set('favorite', favorite)
                setTimeout(function () { applying--; setApplying(applying) }, 0)

                mirror.save(mirror.get())
                mirror.markInitialDone()
                console.log('ScrobSync', 'initial sync completed', { lists: total })
            }
        }

        for (var i = 0; i < listNames.length; i++) {
            syncOneList(listMap, listNames[i], favorite, onListDone)
        }
    })
}

// Sync a single list: push local→scrob, pull scrob→local
function syncOneList(listMap, listName, favorite, callback) {
    var listId = listMap[listName]
    if (!listId) { callback(); return }

    // Find the Lampa key that maps to this list name
    var lampaKey = findKeyForListName(listName)

    api.getListItems(listId, function (scrobItems) {
        // Build scrob element set
        var scrobSet = {}
        for (var i = 0; i < scrobItems.length; i++) {
            var item = scrobItems[i]
            if (item.media && item.media.tmdb_id) {
                var type = toScrobType(item.media.type || 'movie')
                var key = elementKey(type, item.media.tmdb_id)
                scrobSet[key] = { itemId: item.id, media: item.media }
            }
        }

        // Build local element set from the specific category
        var localIds = lampaKey && Array.isArray(favorite[lampaKey]) ? favorite[lampaKey] : []
        var localSet = {}
        for (var j = 0; j < localIds.length; j++) {
            var card = findCardById(favorite.card, localIds[j])
            if (!card) continue

            // Skip items without TMDB id
            if (!card.id) continue

            // Skip non-numeric IDs (slugs etc.) — they cannot be pushed to Scrob
            var idNum = parseInt(card.id, 10)
            if (!idNum) continue

            var mediaType = detectMediaType(card)
            var key = elementKey(mediaType, idNum)
            localSet[key] = true
        }

        // PUSH: localSet − scrobSet → POST /lists/{id}/items
        var toAdd = []
        for (var k in localSet) {
            if (!scrobSet[k]) toAdd.push(k)
        }

        // PULL: scrobSet − localSet → reconstruct minimal cards
        var toRemove = []
        for (var sk in scrobSet) {
            if (!localSet[sk]) toRemove.push({ key: sk, itemId: scrobSet[sk].itemId, media: scrobSet[sk].media })
        }

        // Execute push sequentially with 150ms pause
        pushItems(listId, listName, toAdd, 0, function () {
            // Execute pull: add missing items to local
            pullItems(listId, lampaKey, favorite, toRemove, 0, function () {
                callback()
            })
        })
    }, function () {
        callback()
    })
}

// Find the Lampa key that maps to a given Scrob list name
// Priority: 1) mapstore reverse lookup, 2) canonical names
function findKeyForListName(listName) {
    // First check mapstore (mapped lists by name)
    var map = mapstore.getMap()
    var mapKeys = Object.keys(map)
    for (var i = 0; i < mapKeys.length; i++) {
        if (map[mapKeys[i]].list_name === listName) return mapKeys[i]
    }

    // Then check canonical names
    var canonicals = ['book', 'like', 'wath', 'scheduled', 'continued', 'thrown', 'look']
    for (var j = 0; j < canonicals.length; j++) {
        if (listNameForKey(canonicals[j]) === listName) return canonicals[j]
    }

    // Check custom keys by reverse-mapping
    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { return null }
    }
    var allKeys = syncableKeys(favorite)
    for (var k = 0; k < allKeys.length; k++) {
        if (listNameForKey(allKeys[k]) === listName) return allKeys[k]
    }
    return null
}

// Find the Lampa key for a given Scrob list_id
// Priority: 1) mapstore reverse lookup by id, 2) canonical names via mirror
function findKeyForListId(listId) {
    // First check mapstore
    var mappedKey = mapstore.getMappingForList(listId)
    if (mappedKey) return mappedKey

    // Fallback: find list name by id in mirror, then use findKeyForListName
    var listName = findListNameById(listId)
    if (listName) return findKeyForListName(listName)

    return null
}

// Find a card by id in the card array
function findCardById(cards, id) {
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].id == id) return cards[i]
    }
    return null
}

// Push items sequentially with 150ms pause
function pushItems(listId, listName, items, index, callback) {
    if (index >= items.length) { callback(); return }

    var parts = parseElementKey(items[index])
    var tmdbId = parseInt(parts.tmdbId, 10)

    if (!tmdbId) {
        // Skip items without valid TMDB id
        pushItems(listId, listName, items, index + 1, callback)
        return
    }

    // Socket-plane write via POST /socket/events; REST path when socket inactive
    if (isSocketActive()) {
        api.socketIngest('list.item_added', {
            list_id: listId,
            media_tmdb_id: tmdbId,
            media_type: parts.mediaType
        }, function (response) {
            // Store item_id in mirror if server returned it, otherwise null mark
            mirror.setItemId(listName, items[index], response && response.id ? response.id : null)
            setTimeout(function () {
                pushItems(listId, listName, items, index + 1, callback)
            }, 150)
        }, function (err, status) {
            // 409 means the item already exists — treat as success for the mirror
            if (status === 409 || String(err).indexOf('409') !== -1) {
                mirror.setItemId(listName, items[index], null)
                setTimeout(function () {
                    pushItems(listId, listName, items, index + 1, callback)
                }, 150)
                return
            }
            // Ingest errors go to retry queue, no REST fallback
            enqueueRetry({ type: 'add', listId: listId, listName: listName, key: items[index] })
            setTimeout(function () {
                pushItems(listId, listName, items, index + 1, callback)
            }, 150)
        })
        return
    }

    api.addListItem(listId, tmdbId, parts.mediaType, function (response) {
        // Store item_id in mirror if server returned it, otherwise null mark (key existence still counts)
        mirror.setItemId(listName, items[index], response && response.id ? response.id : null)
        setTimeout(function () {
            pushItems(listId, listName, items, index + 1, callback)
        }, 150)
    }, function (err, status) {
        // 409 means the item already exists — treat as success for the mirror
        if (status === 409 || String(err).indexOf('409') !== -1) {
            mirror.setItemId(listName, items[index], null)
            setTimeout(function () {
                pushItems(listId, listName, items, index + 1, callback)
            }, 150)
            return
        }
        // Skip failed items, continue with next
        setTimeout(function () {
            pushItems(listId, listName, items, index + 1, callback)
        }, 150)
    })
}

// Find list name by list_id in mirror
function findListNameById(listId) {
    var m = mirror.get()
    var names = Object.keys(m.lists)
    for (var i = 0; i < names.length; i++) {
        if (m.lists[names[i]].list_id == listId) return names[i]
    }
    return null
}

// Pull items: add missing Scrob items to local Lampa storage
function pullItems(listId, lampaKey, favorite, items, index, callback) {
    if (index >= items.length) { callback(); return }

    var item = items[index]
    var parsed = parseElementKey(item.key)

    // Build card from Scrob media if available, otherwise minimal fallback
    var card = null
    if (item.media) {
        card = cardFromScrobMedia(item.media)
    }
    if (!card) {
        card = {
            id: parseInt(parsed.tmdbId, 10),
            method: toLampaMethod(parsed.mediaType),
            title: parsed.tmdbId,
            poster_path: ''
        }
        if (parsed.mediaType === 'series') {
            card.name = parsed.tmdbId
            card.original_name = parsed.tmdbId
        }
    }

    // Add card to card array if not present
    var exists = findCardById(favorite.card, card.id)
    if (!exists) {
        favorite.card.push(card)
    }

    // Add to category array
    if (lampaKey && Array.isArray(favorite[lampaKey])) {
        if (favorite[lampaKey].indexOf(card.id) === -1) {
            favorite[lampaKey].push(card.id)
        }
    }

    // For mark categories: remove from other marks (section 13, point 3)
    if (lampaKey && MARK_KEYS.indexOf(lampaKey) !== -1) {
        removeCardFromOtherMarks(favorite, card.id, lampaKey)
    }

    // Update mirror
    var m = mirror.get()
    var listName = findListNameById(listId)
    if (listName) {
        if (!m.lists[listName]) {
            m.lists[listName] = { list_id: listId, items: {} }
        }
        m.lists[listName].items[item.key] = item.itemId
    }

    setTimeout(function () {
        pullItems(listId, lampaKey, favorite, items, index + 1, callback)
    }, 0)
}

// Remove a card from all mark categories except the specified one
function removeCardFromOtherMarks(favorite, cardId, exceptKey) {
    for (var i = 0; i < MARK_KEYS.length; i++) {
        var key = MARK_KEYS[i]
        if (key === exceptKey) continue
        if (!Array.isArray(favorite[key])) continue

        var idx = favorite[key].indexOf(cardId)
        if (idx !== -1) {
            favorite[key].splice(idx, 1)
        }
    }
}

// ─── Outbound real-time (section 8.1) ─────────────────────

function setupOutboundListener() {
    storageListener = function (e) {
        if (!running) return
        if (e.name !== 'favorite') return
        if (applying > 0) {
            console.log('ScrobSync', 'outbound skipped: echo guard')
            return  // Echo guard
        }

        // Debounce: batch changes within 500ms
        if (outboundTimer) clearTimeout(outboundTimer)
        outboundTimer = setTimeout(function () {
            outboundDiff()
        }, DEBOUNCE_MS)
    }

    Lampa.Storage.listener.follow('change', storageListener)
}

// Compute diff and push changes to Scrob
function outboundDiff() {
    if (!hasSession()) return

    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { return }
    }
    if (!favorite.card) favorite.card = []

    var m = mirror.get()
    var listNames = Object.keys(m.lists)

    console.log('ScrobSync', 'outbound diff', { lists: listNames.length })

    // Self-heal: find syncable keys missing from mirror
    if (!healing) {
        var missing = []
        syncableKeys(favorite).forEach(function (key) {
            var name = listNameForKey(key)
            if (!name) return
            var mapped = mapstore.getMapping(key)
            if (mapped) {
                if (!m.lists[mapped.list_name]) missing.push({ key: key, name: mapped.list_name, listId: mapped.list_id })
                return
            }
            if (!m.lists[name]) missing.push({ key: key, name: name, listId: null })
        })

        if (missing.length > 0) {
            healing = true
            console.log('ScrobSync', 'self-heal', missing.length)

            // Fully empty mirror → full initial sync
            if (listNames.length === 0) {
                healing = false
                initialSync()
                return
            }

            // Partial: resolve each missing key via ensureList, then let next debounce pick up filled mirror
            var pending = missing.length
            missing.forEach(function (entry) {
                if (entry.listId) {
                    mergePair(entry.key, entry.listId, entry.name, function () {
                        pending--
                        if (pending <= 0) healing = false
                    })
                } else {
                    ensureList(entry.name, entry.key, function () {
                        pending--
                        if (pending <= 0) healing = false
                    })
                }
            })
            return
        }
    }

    for (var i = 0; i < listNames.length; i++) {
        var listName = listNames[i]
        var listData = m.lists[listName]
        var listId = listData.list_id
        if (!listId) continue

        // Find the Lampa key for this list
        var lampaKey = findKeyForListName(listName)
        if (!lampaKey) continue

        var localIds = Array.isArray(favorite[lampaKey]) ? favorite[lampaKey] : []
        var localSet = {}

        for (var j = 0; j < localIds.length; j++) {
            var card = findCardById(favorite.card, localIds[j])
            if (!card || !card.id) continue

            var mediaType = detectMediaType(card)
            // Skip non-numeric IDs (slugs etc.) — they cannot be pushed to Scrob
            var idNum = parseInt(card.id, 10)
            if (!idNum) continue

            var key = elementKey(mediaType, idNum)
            localSet[key] = true
        }

        // Diff against mirror
        var mirrorItems = listData.items || {}

        // Added locally: in localSet but not in mirror (key existence — null marks count as present)
        var toAdd = []
        for (var k in localSet) {
            if (typeof mirrorItems[k] === 'undefined') toAdd.push(k)
        }

        // Removed locally: in mirror but not in localSet
        var toRemove = []
        for (var mk in mirrorItems) {
            if (!localSet[mk]) toRemove.push({ key: mk, itemId: mirrorItems[mk] })
        }

        if (toAdd.length > 0 || toRemove.length > 0) {
            console.log('ScrobSync', 'outbound', listName, { add: toAdd.length, remove: toRemove.length })
        }

        // Execute add operations
        pushOutboundItems(listId, listName, toAdd, 0, function () {
            // Execute remove operations
            removeOutboundItems(listId, listName, toRemove, 0, function () {
                mirror.save(mirror.get())
            })
        })
    }
}

// Push added items to Scrob: REST first guarantees server persistence,
// socket notification afterwards is fire-and-forget realtime for other devices
function pushOutboundItems(listId, listName, items, index, callback) {
    if (index >= items.length) { callback(); return }

    var parts = parseElementKey(items[index])
    var tmdbId = parseInt(parts.tmdbId, 10)

    if (!tmdbId) {
        pushOutboundItems(listId, listName, items, index + 1, callback)
        return
    }

    // Socket-plane write via POST /socket/events; REST path when socket inactive
    if (isSocketActive()) {
        api.socketIngest('list.item_added', {
            list_id: listId,
            media_tmdb_id: tmdbId,
            media_type: parts.mediaType
        }, function (response) {
            // Store item_id in mirror if provided, otherwise null mark
            mirror.setItemId(listName, items[index], response && response.id ? response.id : null)
            setTimeout(function () {
                pushOutboundItems(listId, listName, items, index + 1, callback)
            }, 150)
        }, function (err, status) {
            // 409 means the item already exists — treat as success for the mirror
            if (status === 409 || String(err).indexOf('409') !== -1) {
                mirror.setItemId(listName, items[index], null)
                setTimeout(function () {
                    pushOutboundItems(listId, listName, items, index + 1, callback)
                }, 150)
                return
            }
            // Ingest errors go to retry queue, no REST fallback
            enqueueRetry({ type: 'add', listId: listId, listName: listName, key: items[index] })
            setTimeout(function () {
                pushOutboundItems(listId, listName, items, index + 1, callback)
            }, 150)
        })
        return
    }

    api.addListItem(listId, tmdbId, parts.mediaType, function (response) {
        // Store item_id in mirror if provided, otherwise null mark (key existence still counts)
        mirror.setItemId(listName, items[index], response && response.id ? response.id : null)
        setTimeout(function () {
            pushOutboundItems(listId, listName, items, index + 1, callback)
        }, 150)
    }, function (err, status) {
        // 409 means the item already exists — treat as success for the mirror
        if (status === 409 || String(err).indexOf('409') !== -1) {
            mirror.setItemId(listName, items[index], null)
            setTimeout(function () {
                pushOutboundItems(listId, listName, items, index + 1, callback)
            }, 150)
            return
        }
        // Retry queue
        enqueueRetry({ type: 'add', listId: listId, listName: listName, key: items[index] })
        setTimeout(function () {
            pushOutboundItems(listId, listName, items, index + 1, callback)
        }, 150)
    })
}

// Remove items from Scrob
function removeOutboundItems(listId, listName, items, index, callback) {
    if (index >= items.length) { callback(); return }

    var item = items[index]

    // Socket-plane write via POST /socket/events; uses TMDB identity, no item_id needed
    if (isSocketActive()) {
        var ingestParts = parseElementKey(item.key)
        var ingestTmdbId = parseInt(ingestParts.tmdbId, 10)
        if (!ingestTmdbId) {
            removeOutboundItems(listId, listName, items, index + 1, callback)
            return
        }
        api.socketIngest('list.item_removed', {
            list_id: listId,
            media_tmdb_id: ingestTmdbId,
            media_type: ingestParts.mediaType
        }, function () {
            mirror.removeItemId(listName, item.key)
            setTimeout(function () {
                removeOutboundItems(listId, listName, items, index + 1, callback)
            }, 150)
        }, function (err) {
            // Check for 401/403
            if (isAuthError(err)) {
                pauseSync('Authentication expired')
                return
            }
            // Ingest errors go to retry queue, no REST fallback
            enqueueRetry({ type: 'remove', listId: listId, listName: listName, key: item.key, itemId: item.itemId })
            setTimeout(function () {
                removeOutboundItems(listId, listName, items, index + 1, callback)
            }, 150)
        })
        return
    }

    if (!item.itemId) {
        // No item_id — can't delete; skip
        removeOutboundItems(listId, listName, items, index + 1, callback)
        return
    }

    api.deleteListItem(listId, item.itemId, function () {
        mirror.removeItemId(listName, item.key)
        setTimeout(function () {
            removeOutboundItems(listId, listName, items, index + 1, callback)
        }, 150)
    }, function (err) {
        // Check for 401/403
        if (isAuthError(err)) {
            pauseSync('Authentication expired')
            return
        }
        enqueueRetry({ type: 'remove', listId: listId, listName: listName, key: item.key, itemId: item.itemId })
        setTimeout(function () {
            removeOutboundItems(listId, listName, items, index + 1, callback)
        }, 150)
    })
}

// ─── Retry queue ──────────────────────────────────────────

function enqueueRetry(op) {
    op.retries = (op.retries || 0) + 1
    if (op.retries <= RETRY_MAX) {
        retryQueue.push(op)
    } else {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_lost'))
    }
}

function startRetryLoop() {
    if (retryTimer) return

    retryTimer = setInterval(function () {
        if (!running || retryQueue.length === 0) return

        var batch = retryQueue.splice(0, retryQueue.length)
        for (var i = 0; i < batch.length; i++) {
            var op = batch[i]
            if (op.type === 'add') {
                var parts = parseElementKey(op.key)
                var tmdbId = parseInt(parts.tmdbId, 10)
                if (tmdbId) {
                    // Socket-plane write via POST /socket/events when active; REST otherwise
                    if (isSocketActive()) {
                        api.socketIngest('list.item_added', {
                            list_id: op.listId,
                            media_tmdb_id: tmdbId,
                            media_type: parts.mediaType
                        }, function (response) {
                            mirror.setItemId(op.listName, op.key, response && response.id ? response.id : null)
                        }, function (err, status) {
                            if (status === 409 || String(err).indexOf('409') !== -1) {
                                // Already exists — treat as success
                                mirror.setItemId(op.listName, op.key, null)
                                return
                            }
                            op.retries = (op.retries || 0) + 1
                            if (op.retries <= RETRY_MAX) retryQueue.push(op)
                        })
                    } else {
                        api.addListItem(op.listId, tmdbId, parts.mediaType, function (response) {
                            mirror.setItemId(op.listName, op.key, response && response.id ? response.id : null)
                        }, function (err, status) {
                            if (status === 409 || String(err).indexOf('409') !== -1) {
                                // Already exists — treat as success
                                mirror.setItemId(op.listName, op.key, null)
                                return
                            }
                            op.retries = (op.retries || 0) + 1
                            if (op.retries <= RETRY_MAX) retryQueue.push(op)
                        })
                    }
                }
            } else if (op.type === 'remove') {
                // Socket-plane write via POST /socket/events when active; REST otherwise
                if (isSocketActive()) {
                    var retryParts = parseElementKey(op.key)
                    var retryTmdbId = parseInt(retryParts.tmdbId, 10)
                    if (!retryTmdbId) continue
                    api.socketIngest('list.item_removed', {
                        list_id: op.listId,
                        media_tmdb_id: retryTmdbId,
                        media_type: retryParts.mediaType
                    }, function () {
                        mirror.removeItemId(op.listName, op.key)
                    }, function () {
                        op.retries = (op.retries || 0) + 1
                        if (op.retries <= RETRY_MAX) retryQueue.push(op)
                    })
                    continue
                }
                api.deleteListItem(op.listId, op.itemId, function () {
                    mirror.removeItemId(op.listName, op.key)
                }, function () {
                    op.retries = (op.retries || 0) + 1
                    if (op.retries <= RETRY_MAX) retryQueue.push(op)
                })
            }
        }
    }, RETRY_DELAY)
}

function stopRetryLoop() {
    if (retryTimer) {
        clearInterval(retryTimer)
        retryTimer = null
    }
    retryQueue = []
}

// ─── Inbound polling (section 8.2) ────────────────────────

function getPollInterval() {
    var val = Lampa.Storage.get('scrob_sync_interval', '30')
    return parseInt(val, 10) * 1000 || 30000
}

function startPolling() {
    if (pollTimer) return

    pollTimer = setInterval(function () {
        if (!running || !hasSession()) return
        // Skip polling when socket is active (real-time via WebSocket)
        if (isSocketActive()) return
        pollChanges()
    }, getPollInterval())
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
    }
}

function pollChanges() {
    api.getLists(function (serverLists) {
        var m = mirror.get()
        var changedLists = []
        var mappedIds = mapstore.getMappedIds()

        // Find [Lampa] lists and mapped lists that have changed
        for (var i = 0; i < serverLists.length; i++) {
            var sl = serverLists[i]
            if (!sl.name) continue

            var isLampaList = sl.name.indexOf('[Lampa] ') === 0
            var isMapped = mappedIds.indexOf(sl.id) !== -1

            if (!isLampaList && !isMapped) continue

            // Use list name as mirror key (mapped lists stored under their real name)
            var mirrorKey = sl.name
            var mirrorList = m.lists[mirrorKey]
            if (!mirrorList) {
                // New list on server — need to fetch items
                changedLists.push(sl)
                continue
            }

            // Check if updated_at or item_count changed
            if (sl.updated_at !== mirrorList.server_updated_at ||
                sl.item_count !== Object.keys(mirrorList.items).length) {
                changedLists.push(sl)
            }
        }

        if (changedLists.length === 0) return

        console.log('ScrobSync', 'poll changes', changedLists.length)

        // Fetch items for changed lists and apply inbound changes
        processChangedLists(changedLists, 0)
    }, function () {
        // Network error on poll — silent, will retry on next interval
        console.warn('ScrobSync', 'poll getLists failed')
    })
}

function processChangedLists(lists, index) {
    if (index >= lists.length) return

    var sl = lists[index]
    api.getListItems(sl.id, function (items) {
        applyInboundItems(sl.name, sl.id, items, sl.updated_at)
        processChangedLists(lists, index + 1)
    }, function () {
        processChangedLists(lists, index + 1)
    })
}

function applyInboundItems(listName, listId, scrobItems, serverUpdatedAt) {
    var m = mirror.get()
    var mirrorList = m.lists[listName] || { list_id: listId, items: {} }

    // Build current scrob element set
    var scrobSet = {}
    for (var i = 0; i < scrobItems.length; i++) {
        var item = scrobItems[i]
        if (item.media && item.media.tmdb_id) {
            var type = toScrobType(item.media.type || 'movie')
            var key = elementKey(type, item.media.tmdb_id)
            scrobSet[key] = {
                itemId: item.id,
                media: item.media
            }
        }
    }

    var mirrorItems = mirrorList.items || {}

    // Find added items (in scrob but not in mirror — key existence, null marks count as present)
    var added = []
    for (var sk in scrobSet) {
        if (typeof mirrorItems[sk] === 'undefined') {
            added.push({ key: sk, media: scrobSet[sk].media, itemId: scrobSet[sk].itemId })
        }
    }

    // Find removed items (in mirror but not in scrob)
    var removed = []
    for (var mk in mirrorItems) {
        if (!scrobSet[mk]) {
            removed.push(mk)
        }
    }

    if (added.length === 0 && removed.length === 0) {
        // Only update server_updated_at
        mirrorList.server_updated_at = serverUpdatedAt
        m.lists[listName] = mirrorList
        mirror.save(m)
        return
    }

    // Apply inbound changes under echo guard
    applying++
    setApplying(applying)

    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
    }
    if (!favorite.card) favorite.card = []

    var lampaKey = findKeyForListName(listName)

    // Process additions
    for (var a = 0; a < added.length; a++) {
        var add = added[a]
        var parsed = parseElementKey(add.key)
        var tmdbId = parseInt(parsed.tmdbId, 10)
        if (!tmdbId) continue

        // Build or find card
        var card = findCardById(favorite.card, tmdbId)
        if (!card) {
            card = cardFromScrobMedia(add.media) || (function () {
                var c = {
                    id: tmdbId,
                    method: toLampaMethod(parsed.mediaType),
                    title: add.media.title || parsed.tmdbId,
                    poster_path: add.media.poster_path || '',
                    release_date: add.media.release_date || ''
                }
                if (parsed.mediaType === 'series') {
                    c.name = c.title
                    c.original_name = c.title
                }
                return c
            })()
            favorite.card.push(card)
        }

        // Add to category
        if (lampaKey && Array.isArray(favorite[lampaKey])) {
            if (favorite[lampaKey].indexOf(tmdbId) === -1) {
                favorite[lampaKey].push(tmdbId)
            }
        }

        // Mark categories: remove from other marks (section 13, point 3)
        if (lampaKey && MARK_KEYS.indexOf(lampaKey) !== -1) {
            removeCardFromOtherMarks(favorite, tmdbId, lampaKey)
        }

        // Update mirror
        mirrorList.items[add.key] = add.itemId
    }

    // Process removals
    for (var r = 0; r < removed.length; r++) {
        var rmKey = removed[r]
        var rmParsed = parseElementKey(rmKey)
        var rmId = parseInt(rmParsed.tmdbId, 10)

        if (lampaKey && Array.isArray(favorite[lampaKey])) {
            var idx = favorite[lampaKey].indexOf(rmId)
            if (idx !== -1) {
                favorite[lampaKey].splice(idx, 1)
            }
        }

        delete mirrorList.items[rmKey]
    }

    // Single Storage.set after all changes
    Lampa.Storage.set('favorite', favorite)

    // Update mirror with server_updated_at and save
    mirrorList.server_updated_at = serverUpdatedAt
    m.lists[listName] = mirrorList
    mirror.save(m)

    // Release echo guard
    setTimeout(function () { applying--; setApplying(applying) }, 0)
}

// ─── Auth error handling ──────────────────────────────────

function isAuthError(err) {
    if (!err) return false
    var str = String(err)
    return str.indexOf('401') !== -1 || str.indexOf('403') !== -1
}

function pauseSync(reason) {
    running = false
    stopPolling()
    stopRetryLoop()
    console.warn('ScrobSync', 'paused:', reason)
    Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_paused') + ': ' + reason)
}

// ─── Profile change handling ──────────────────────────────

function setupProfileListener() {
    var lastProfileId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID)

    profileListener = function (e) {
        if (e.name === KEYS.ACTIVE_PROFILE_ID) {
            var newId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID)
            if (newId !== lastProfileId) {
                lastProfileId = newId
                // Stop, reset mirror, re-sync for new profile
                stop()
                mirror.reset()
                mirror.clearInitialDone()
                start()
            }
        }
    }

    Lampa.Storage.listener.follow('change', profileListener)
}

// ─── Mapping merge (section 14.3) ─────────────────────────

// Merge a single pair: union of local category and Scrob list.
// Push local→scrob, pull scrob→local, under echo guard.
function mergePair(lampaKey, listId, listName, callback) {
    console.log('ScrobSync', 'merge pair', listName)
    api.getListItems(listId, function (scrobItems) {
        var favorite = Lampa.Storage.get('favorite', '{}')
        if (typeof favorite === 'string') {
            try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
        }
        if (!favorite.card) favorite.card = []

        // Build scrob element set
        var scrobSet = {}
        for (var i = 0; i < scrobItems.length; i++) {
            var item = scrobItems[i]
            if (item.media && item.media.tmdb_id) {
                var type = toScrobType(item.media.type || 'movie')
                var key = elementKey(type, item.media.tmdb_id)
                scrobSet[key] = { itemId: item.id, media: item.media }
            }
        }

        // Build local element set
        var localIds = Array.isArray(favorite[lampaKey]) ? favorite[lampaKey] : []
        var localSet = {}
        for (var j = 0; j < localIds.length; j++) {
            var card = findCardById(favorite.card, localIds[j])
            if (!card || !card.id) continue
            var mediaType = detectMediaType(card)
            var ek = elementKey(mediaType, card.id)
            localSet[ek] = true
        }

        // Push: localSet − scrobSet
        var toAdd = []
        for (var k in localSet) {
            if (!scrobSet[k]) toAdd.push(k)
        }

        // Pull: scrobSet − localSet
        var toRemove = []
        for (var sk in scrobSet) {
            if (!localSet[sk]) toRemove.push({ key: sk, itemId: scrobSet[sk].itemId, media: scrobSet[sk].media })
        }

        pushItems(listId, listName, toAdd, 0, function () {
            // Pull under echo guard
            applying++
            setApplying(applying)
            pullItems(listId, lampaKey, favorite, toRemove, 0, function () {
                // Single Storage.set for all pull changes
                Lampa.Storage.set('favorite', favorite)
                setTimeout(function () { applying--; setApplying(applying) }, 0)

                // Update mirror with the mapped list's real name
                var m = mirror.get()
                if (!m.lists[listName]) {
                    m.lists[listName] = { list_id: listId, items: {} }
                }
                // Update mirror items from scrobSet
                for (var sk2 in scrobSet) {
                    m.lists[listName].items[sk2] = scrobSet[sk2].itemId
                }
                // Add pushed items to mirror
                for (var a = 0; a < toAdd.length; a++) {
                    m.lists[listName].items[toAdd[a]] = null
                }
                mirror.save(m)
                callback()
            })
        })
    }, function () {
        callback()
    })
}

// Create a mapping: set mapping, remove orphaned [Lampa] mirror entry, merge pair
export function applyMapping(lampaKey, listId, listName, onDone, onFail) {
    console.log('ScrobSync', 'mapping apply', lampaKey)
    // Exclusivity check
    var success = mapstore.setMapping(lampaKey, listId, listName)
    if (!success) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_map_conflict'))
        if (onFail) onFail()
        return
    }

    // Remove orphaned [Lampa] mirror entry for this key
    var defaultName = listNameForKey(lampaKey)
    if (defaultName) {
        var m = mirror.get()
        if (m.lists[defaultName]) {
            delete m.lists[defaultName]
            mirror.save(m)
        }
    }

    // Merge the mapped pair
    mergePair(lampaKey, listId, listName, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_map_created'))
        if (onDone) onDone()
    })
}

// Remove mapping: delete mapping, remove mirror entry, reset default [Lampa] pair, reconcile
export function removeMappingFlow(lampaKey, onDone) {
    console.log('ScrobSync', 'mapping remove', lampaKey)
    var mapping = mapstore.getMapping(lampaKey)
    if (!mapping) {
        if (onDone) onDone()
        return
    }

    // Remove the mapping
    mapstore.removeMapping(lampaKey)

    // Remove the mapped list's mirror entry
    var m = mirror.get()
    var mappedListName = mapping.list_name
    if (mappedListName && m.lists[mappedListName]) {
        delete m.lists[mappedListName]
    }

    // Reset the default [Lampa] pair's mirror entry to trigger full reconcile
    var defaultName = listNameForKey(lampaKey)
    if (defaultName && m.lists[defaultName]) {
        // Clear items so reconcile does a full diff
        m.lists[defaultName].items = {}
        m.lists[defaultName].server_updated_at = 0
    }
    mirror.save(m)

    // Re-resolve the default [Lampa] list and reconcile
    api.getLists(function (serverLists) {
        var byName = {}
        for (var i = 0; i < serverLists.length; i++) {
            byName[serverLists[i].name] = serverLists[i]
        }

        if (defaultName && byName[defaultName]) {
            // Full reconcile of this pair
            var favorite = Lampa.Storage.get('favorite', '{}')
            if (typeof favorite === 'string') {
                try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
            }
            if (!favorite.card) favorite.card = []

            syncOneList(
                (function () { var r = {}; r[defaultName] = byName[defaultName].id; return r })(),
                defaultName,
                favorite,
                function () {
                    applying++
                    setApplying(applying)
                    Lampa.Storage.set('favorite', favorite)
                    setTimeout(function () { applying--; setApplying(applying) }, 0)
                    mirror.save(mirror.get())
                    if (onDone) onDone()
                }
            )
        } else {
            // Default list doesn't exist on server yet — resolveLists will create it on next cycle
            if (onDone) onDone()
        }
    }, function () {
        if (onDone) onDone()
    })
}

// ─── Public API ───────────────────────────────────────────

// Start the sync engine
export function start() {
    if (running) return
    if (!hasSession()) {
        console.warn('ScrobSync', 'start skipped: no session')
        return
    }
    if (!Lampa.Storage.get('scrob_sync_enabled')) {
        console.warn('ScrobSync', 'start skipped: sync disabled')
        return
    }

    // Check for blocking conflicts
    var conflicts = detectConflicts()
    for (var i = 0; i < conflicts.length; i++) {
        if (conflicts[i].type === 'cub_sync') {
            console.warn('ScrobSync', 'start skipped: CUB conflict')
            Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_blocked_cub'))
            return
        }
    }

    running = true

    // Register socket handlers if socket is provided
    if (activeSocket) {
        registerHandlers(activeSocket)
    }

    // Initial sync if no mirror exists
    var m = mirror.get()
    if (Object.keys(m.lists).length === 0) {
        initialSync()
    }

    // Setup listeners
    setupOutboundListener()
    setupProfileListener()

    // Start polling only if socket is not active (fallback mode)
    if (!isSocketActive()) {
        startPolling()
    }
    startRetryLoop()

    console.log('ScrobSync', 'started', { mirrorLists: Object.keys(mirror.get().lists).length })
}

// Stop the sync engine
export function stop() {
    running = false
    console.log('ScrobSync', 'stopped')

    // Unregister socket handlers
    if (activeSocket) {
        unregisterHandlers(activeSocket)
        activeSocket = null
    }

    if (storageListener) {
        Lampa.Storage.listener.remove('change', storageListener)
        storageListener = null
    }

    if (profileListener) {
        Lampa.Storage.listener.remove('change', profileListener)
        profileListener = null
    }

    if (outboundTimer) {
        clearTimeout(outboundTimer)
        outboundTimer = null
    }

    stopPolling()
    stopRetryLoop()
}

// Force a manual sync (for settings UI "Sync Now" button)
export function forceSync() {
    if (!running) return
    mirror.clearInitialDone()
    initialSync()
}

// Get sync status for display
export function getStatus() {
    var m = mirror.get()
    var listCount = Object.keys(m.lists).length
    var itemCount = 0
    var names = Object.keys(m.lists)
    for (var i = 0; i < names.length; i++) {
        itemCount += Object.keys(m.lists[names[i]].items).length
    }

    return {
        running: running,
        listCount: listCount,
        itemCount: itemCount,
        lastSync: m.updated_at,
        conflicts: detectConflicts(),
        brokenMappings: brokenMappings.slice()
    }
}
