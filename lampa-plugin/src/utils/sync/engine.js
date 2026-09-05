// Scrob sync engine — single-convergence orchestrator for list synchronization.
// Model: Lampa core Account.Bookmarks (src/core/account/bookmarks.js).
// - Outbound: Favorite.listener add/remove + state:changed (custom keys) into one
//   serial push_queue with 500ms debounce. REST is the only write path.
// - Socket: inbound-only notify/invalidate hub (handler.js) → update(). Writes never
//   branch on isSocketActive(): the server already broadcasts REST writes to all devices.
// - Inbound/polling: one update() entry — fetch all lists, converge each pair
//   via applyRemoteDiff with the unified KeyResolver/applicator (mapping.js).
// - Mirror: Tracker-model {version,time} stamp; 409 resolves the real item_id,
//   deletes always use a resolved item_id. received flag guards echo.

import * as api from '../api'
import { registerHandlers, unregisterHandlers, bindUpdate } from './handler'
import { KEYS, hasSession } from '../storage'
import {
    listNameForKey, syncableKeys, detectMediaType,
    elementKey, parseElementKey,
    resolveKeyForListId,
    localElementSet, scrobElementSet,
    applyRemoteAdd, applyRemoteRemove
} from './mapping'
import * as mirror from './mirror'
import * as mapstore from './mapstore'

// ─── State ────────────────────────────────────────────────

var received = false       // Echo guard: true while engine itself writes favorite
var outboundTimer = null   // Debounce timer for outbound push (core: 500ms)
var pushQueue = []         // Serial outbound queue { method, lampaKey, card }
var pushRunning = false    // Serial guard (core: push_running)
var updateTimer = null     // Socket/poll invalidate debounce (core: update_timer 500ms)
var updateRunning = false  // Single-flight update() guard
var pollTimer = null       // Polling interval timer
var retryQueue = []        // Failed REST operations for retry
var retryTimer = null      // Retry interval timer
var running = false        // Engine active flag
var profileListener = null // Profile change listener reference
var brokenMappings = []    // Keys whose mapped list was deleted on server
var healing = false        // Self-heal guard: prevent re-entrant missing-key resolution
var activeSocket = null    // Current WebSocket instance (inbound-only notify)
var handlersBound = false  // Socket handlers registered flag
var socketPollBound = null // Socket open/close hook reference

// Debounce window for batching outbound changes (ms, core bookmarks.js: 500)
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

// ─── Socket integration ───────────────────────────────────

// Provide a WebSocket instance for real-time sync (inbound-only notify).
export function useSocket(socketInstance) {
    // Rebinding: drop handlers from the previous socket before switching.
    if (activeSocket && activeSocket !== socketInstance) unbindSocketHandlers()
    activeSocket = socketInstance
    if (running) {
        bindSocketHandlers()
        if (isSocketActive()) stopPolling()
        else startPolling()
    }
}

// Check if socket is currently connected and active.
export function isSocketActive() {
    return !!(activeSocket && activeSocket.isConnected && activeSocket.isConnected())
}

// ─── Favorite helpers ─────────────────────────────────────

// Read favorite from storage, normalize from string if needed.
function readFavorite() {
    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
    }
    if (!favorite.card) favorite.card = []
    return favorite
}

// Single favorite write under the received guard (core Timeline received pattern).
function writeFavorite(favorite) {
    received = true
    Lampa.Storage.set('favorite', favorite)
    received = false
}

// ─── Outbound: Favorite.listener + state:changed → serial queue ───
// Core pattern: Favorite.listener.follow('add,added'/'remove') in bookmarks.js init().

function onFavoriteAdd(e) {
    if (!running || received) return
    if (!e || !e.where || !e.card || !e.card.id) return
    push('add', e.where, e.card)
}

function onFavoriteRemove(e) {
    if (!running || received) return
    if (!e || !e.where || !e.card) return
    if (e.method && e.method !== 'id') return
    if (!e.card.id) return
    push('remove', e.where, e.card)
}

// Custom categories bypass core Favorite (see main.js toggleCustomCategory) and
// only emit state:changed with type=custom key — bridge them into the same queue.
// Dedupe: core keys already arrived via Favorite.listener; skip if identical op queued.
function onStateChanged(e) {
    if (!running || received) return
    if (!e || e.target !== 'favorite' || e.reason !== 'update') return
    if (!e.type || !e.card || !e.card.id) return
    if (e.method !== 'add' && e.method !== 'added' && e.method !== 'remove') return
    var fav = readFavorite()
    if (!Array.isArray(fav[e.type])) return
    var method = (e.method === 'remove') ? 'remove' : 'add'
    for (var i = 0; i < pushQueue.length; i++) {
        if (pushQueue[i].method === method &&
            pushQueue[i].lampaKey === e.type && pushQueue[i].card.id == e.card.id) return
    }
    push(method, e.type, e.card)
}

function push(method, lampaKey, card) {
    pushQueue.push({ method: method, lampaKey: lampaKey, card: card })
    if (outboundTimer) clearTimeout(outboundTimer)
    outboundTimer = setTimeout(processQueue, DEBOUNCE_MS)
}

// Serial outbound drain: one REST write at a time, then mirror + invalidate.
function processQueue() {
    outboundTimer = null
    if (pushRunning || pushQueue.length === 0) return
    pushRunning = true

    var op = pushQueue.shift()
    writeOne(op, function () {
        pushRunning = false
        if (pushQueue.length > 0) {
            outboundTimer = setTimeout(processQueue, DEBOUNCE_MS)
        }
    })
}

// Resolve list_id for a Lampa key: mapstore first, then mirror by canonical name.
function resolveListId(lampaKey) {
    var mapping = mapstore.getMapping(lampaKey)
    if (mapping && mapping.list_id) return { listId: mapping.list_id, listName: mapping.list_name || listNameForKey(lampaKey) }
    var name = listNameForKey(lampaKey)
    if (!name) return null
    var m = mirror.get()
    if (m.lists[name] && m.lists[name].list_id) return { listId: m.lists[name].list_id, listName: name }
    return null
}

// Single REST write. Socket is notify-only: no socketIngest branch here.
function writeOne(op, done) {
    var target = resolveListId(op.lampaKey)
    if (!target) {
        // Unknown list (e.g. new custom key before self-heal) — defer to update().
        update('self-heal')
        done()
        return
    }
    var cardId = parseInt(op.card.id, 10)
    if (!cardId) { done(); return }
    var mediaType = detectMediaType(op.card)
    var key = elementKey(mediaType, cardId)

    if (op.method === 'add') {
        api.addListItem(target.listId, cardId, mediaType, function (response) {
            mirror.setItemId(target.listName, key, response && response.id ? response.id : null)
            // Notify other devices; our own state already converged via the queue.
            done()
        }, function (err, status) {
            if (status === 409 || String(err).indexOf('409') !== -1) {
                // Already on server: fetch the real item_id so delete stays possible.
                fetchItemId(target.listId, target.listName, key, done)
                return
            }
            if (isAuthError(err)) { pauseSync('Authentication expired'); done(); return }
            enqueueRetry({ type: 'add', listId: target.listId, listName: target.listName, key: key, tmdbId: cardId, mediaType: mediaType })
            done()
        })
    } else {
        var itemId = mirror.getItemId(target.listName, key)
        if (!itemId) {
            // No item_id (409 null-mark or missed ingest): resolve before delete.
            fetchItemId(target.listId, target.listName, key, function (resolved) {
                var rid = mirror.getItemId(target.listName, key)
                if (rid) {
                    api.deleteListItem(target.listId, rid, function () {
                        mirror.removeItemId(target.listName, key)
                        done()
                    }, function (err) {
                        if (isAuthError(err)) { pauseSync('Authentication expired'); done(); return }
                        enqueueRetry({ type: 'remove', listId: target.listId, listName: target.listName, key: key, itemId: rid })
                        done()
                    })
                } else {
                    // Item is neither on server nor in mirror — converge by dropping the mark.
                    mirror.removeItemId(target.listName, key)
                    done()
                }
            }, true)
            return
        }
        api.deleteListItem(target.listId, itemId, function () {
            mirror.removeItemId(target.listName, key)
            done()
        }, function (err) {
            if (isAuthError(err)) { pauseSync('Authentication expired'); done(); return }
            enqueueRetry({ type: 'remove', listId: target.listId, listName: target.listName, key: key, itemId: itemId })
            done()
        })
    }
}

// Fetch the server item_id for one element key (fixes 409 null-marks).
// When onlyCheck is set, never creates — just resolves or drops the mark.
function fetchItemId(listId, listName, key, callback, onlyCheck) {
    api.getListItems(listId, function (items) {
        var set = scrobElementSet(items)
        if (set[key]) {
            mirror.setItemId(listName, key, set[key].itemId)
        } else if (onlyCheck) {
            mirror.removeItemId(listName, key)
        } else {
            mirror.setItemId(listName, key, null)
        }
        if (callback) callback(set[key] ? set[key].itemId : null)
    }, function () {
        if (!onlyCheck) mirror.setItemId(listName, key, null)
        if (callback) callback(null)
    })
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
        var favorite = readFavorite()

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
                        resolved[mapping.list_name || listNameForKey(key)] = serverList.id
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

// Ensure a single list exists on server, merge into mirror, then re-run update.
// Self-heal completion always triggers a повторний диф (converge), never just fills the mirror.
function ensureList(name, lampaKey, callback) {
    function afterResolve(listId) {
        mergePair(lampaKey, listId, name, function () {
            update('self-heal')
            if (callback) callback()
        })
    }
    api.getLists(function (serverLists) {
        var byName = {}
        for (var i = 0; i < serverLists.length; i++) {
            byName[serverLists[i].name] = serverLists[i]
        }

        if (byName[name]) {
            mirror.setList(name, byName[name].id)
            afterResolve(byName[name].id)
        } else {
            api.createList(name, function (created) {
                mirror.setList(name, created.id)
                afterResolve(created.id)
            }, callback)
        }
    }, callback)
}

// ─── Converge: single update() for inbound WS + polling ───
// Mirrors Account.Bookmarks.update(): fetch everything, converge every pair,
// single favorite write, bump the Tracker stamp.

export function update(reason) {
    if (!running || !hasSession()) return
    if (updateRunning) {
        // Coalesce concurrent invalidations into one trailing run.
        if (updateTimer) clearTimeout(updateTimer)
        updateTimer = setTimeout(function () { updateTimer = null; update(reason) }, DEBOUNCE_MS)
        return
    }
    updateRunning = true
    api.getLists(function (serverLists) {
        convergeAll(serverLists, function () {
            updateRunning = false
        })
    }, function () {
        console.warn('ScrobSync', 'update getLists failed (' + (reason || 'poll') + ')')
        updateRunning = false
    })
}

// Debounced invalidate entry used by the socket hub and the poll timer.
export function invalidate(reason) {
    if (!running || !hasSession()) return
    if (updateRunning) return
    if (updateTimer) clearTimeout(updateTimer)
    updateTimer = setTimeout(function () {
        updateTimer = null
        update(reason || 'invalidate')
    }, DEBOUNCE_MS)
}

function convergeAll(serverLists, done) {
    var favorite = readFavorite()
    var map = mapstore.getMap()
    var m = mirror.get()

    // Index server lists by id.
    var byId = {}
    for (var i = 0; i < serverLists.length; i++) {
        if (serverLists[i].id != null) byId[serverLists[i].id] = serverLists[i]
    }

    // Build converge targets: every known pair exactly once.
    // Sources: mirror entries + mapstore mappings + local syncable keys.
    var targets = {} // listName -> { listId, lampaKey }
    var mirrorNames = Object.keys(m.lists)
    for (var a = 0; a < mirrorNames.length; a++) {
        var entry = m.lists[mirrorNames[a]]
        if (entry && entry.list_id) {
            targets[mirrorNames[a]] = {
                listId: entry.list_id,
                lampaKey: resolveKeyForListId(entry.list_id, map, m.lists, favorite)
            }
        }
    }
    var mapKeys = Object.keys(map)
    for (var b = 0; b < mapKeys.length; b++) {
        var me = map[mapKeys[b]]
        if (me && me.list_id && byId[me.list_id]) {
            var mname = me.list_name || byId[me.list_id].name
            if (!targets[mname]) targets[mname] = { listId: me.list_id, lampaKey: mapKeys[b] }
        }
    }
    var keys = syncableKeys(favorite)
    for (var c = 0; c < keys.length; c++) {
        var dname = listNameForKey(keys[c])
        if (dname && !targets[dname] && byId && m.lists[dname]) {
            targets[dname] = { listId: m.lists[dname].list_id, lampaKey: keys[c] }
        }
    }

    var names = Object.keys(targets)
    var changed = false

    function next(index) {
        if (index >= names.length) {
            if (changed) {
                writeFavorite(favorite)
                mirror.save(mirror.get())
            } else {
                // Still bump the Tracker stamp: converged-noop is a successful sync.
                mirror.save(mirror.get())
            }
            // Self-heal pass: brand-new local keys with no server list yet.
            selfHeal(favorite, map, function () { done() })
            return
        }
        var listName = names[index]
        var target = targets[listName]
        if (!target.listId || !target.lampaKey) { next(index + 1); return }
        convergeOneList(listName, target.listId, target.lampaKey, favorite, function (listChanged) {
            if (listChanged) changed = true
            next(index + 1)
        })
    }
    if (names.length === 0) {
        selfHeal(favorite, map, function () { done() })
        return
    }
    next(0)
}

// Converge one pair: pull remote→local and push local→remote, REST only.
function convergeOneList(listName, listId, lampaKey, favorite, callback) {
    api.getListItems(listId, function (scrobItems) {
        var scrobSet = scrobElementSet(scrobItems)
        var localSet = localElementSet(favorite, lampaKey)
        var mirrorItems = (mirror.getList(listName) || {}).items || {}

        // Remote-first: additions and removals relative to the converged mirror.
        var toAddLocal = []
        for (var sk in scrobSet) {
            if (typeof mirrorItems[sk] === 'undefined' && !localSet[sk]) {
                toAddLocal.push({ key: sk, media: scrobSet[sk].media })
            } else if (typeof mirrorItems[sk] === 'undefined' && localSet[sk]) {
                // Both sides added the same item while offline — adopt the server item_id.
                mirror.setItemId(listName, sk, scrobSet[sk].itemId)
            }
        }
        var toRemoveLocal = []
        for (var mk in mirrorItems) {
            if (!scrobSet[mk] && localSet[mk]) {
                // Gone on server but present locally: another device removed it — follow.
                // Our own queued removes carry a real item_id and win on push below.
                var stillQueued = false
                for (var q = 0; q < pushQueue.length; q++) {
                    if (pushQueue[q].lampaKey === lampaKey && pushQueue[q].method === 'remove') {
                        var qp = parseElementKey(mk)
                        if (String(pushQueue[q].card.id) === String(qp.tmdbId)) { stillQueued = true; break }
                    }
                }
                if (!stillQueued) toRemoveLocal.push(mk)
            } else if (!scrobSet[mk] && !localSet[mk]) {
                mirror.removeItemId(listName, mk)
            }
        }

        var listChanged = (toAddLocal.length > 0 || toRemoveLocal.length > 0)

        for (var ai = 0; ai < toAddLocal.length; ai++) {
            var parsed = parseElementKey(toAddLocal[ai].key)
            applyRemoteAdd(favorite, lampaKey, parseInt(parsed.tmdbId, 10), toAddLocal[ai].media)
            mirror.setItemId(listName, toAddLocal[ai].key, scrobSet[toAddLocal[ai].key].itemId)
        }
        for (var ri = 0; ri < toRemoveLocal.length; ri++) {
            var rparsed = parseElementKey(toRemoveLocal[ri])
            applyRemoteRemove(favorite, lampaKey, parseInt(rparsed.tmdbId, 10))
            mirror.removeItemId(listName, toRemoveLocal[ri])
        }

        // Local-first: push what is local but missing on the server.
        var toPush = []
        var freshLocal = localElementSet(favorite, lampaKey)
        for (var lk in freshLocal) {
            if (!scrobSet[lk]) toPush.push(lk)
        }
        if (toPush.length === 0) { callback(listChanged); return }
        if (listChanged) listChanged = true
        pushRestItems(listId, listName, toPush, 0, function () {
            callback(true)
        })
    }, function () {
        callback(false)
    })
}

// Sequential REST push with 150ms pause between writes.
function pushRestItems(listId, listName, items, index, callback) {
    if (index >= items.length) { callback(); return }
    var parts = parseElementKey(items[index])
    var tmdbId = parseInt(parts.tmdbId, 10)
    if (!tmdbId) { pushRestItems(listId, listName, items, index + 1, callback); return }
    api.addListItem(listId, tmdbId, parts.mediaType, function (response) {
        mirror.setItemId(listName, items[index], response && response.id ? response.id : null)
        setTimeout(function () {
            pushRestItems(listId, listName, items, index + 1, callback)
        }, 150)
    }, function (err, status) {
        if (status === 409 || String(err).indexOf('409') !== -1) {
            fetchItemId(listId, listName, items[index], function () {
                setTimeout(function () {
                    pushRestItems(listId, listName, items, index + 1, callback)
                }, 150)
            })
            return
        }
        if (isAuthError(err)) { pauseSync('Authentication expired'); callback(); return }
        enqueueRetry({ type: 'add', listId: listId, listName: listName, key: items[index], tmdbId: tmdbId, mediaType: parts.mediaType })
        setTimeout(function () {
            pushRestItems(listId, listName, items, index + 1, callback)
        }, 150)
    })
}

// Self-heal: brand-new local keys with no server list yet → ensureList + re-diff.
function selfHeal(favorite, map, done) {
    if (healing) { done(); return }
    var m = mirror.get()
    var missing = []
    var keys = syncableKeys(favorite)
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        var mapped = map[key]
        if (mapped) {
            if (mapped.list_id && !m.lists[mapped.list_name]) {
                missing.push({ key: key, name: mapped.list_name, listId: mapped.list_id })
            }
            continue
        }
        var name = listNameForKey(key)
        if (name && !m.lists[name]) missing.push({ key: key, name: name, listId: null })
    }
    if (missing.length === 0) { done(); return }
    healing = true
    var pending = missing.length
    function oneDone() {
        pending--
        if (pending <= 0) { healing = false; done() }
    }
    for (var j = 0; j < missing.length; j++) {
        (function (entry) {
            if (entry.listId) {
                mirror.setList(entry.name, entry.listId)
                mergePair(entry.key, entry.listId, entry.name, oneDone)
            } else {
                ensureList(entry.name, entry.key, oneDone)
            }
        })(missing[j])
    }
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
        // First converge goes through the single update() path.
        mirror.markInitialDone()
        update('initial')
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

function processRetryOp(op) {
    if (op.type === 'add') {
        var parts = parseElementKey(op.key)
        var tmdbId = op.tmdbId || parseInt(parts.tmdbId, 10)
        var mediaType = op.mediaType || parts.mediaType
        if (!tmdbId) return
        api.addListItem(op.listId, tmdbId, mediaType, function (response) {
            mirror.setItemId(op.listName, op.key, response && response.id ? response.id : null)
        }, function (err, status) {
            if (status === 409 || String(err).indexOf('409') !== -1) {
                fetchItemId(op.listId, op.listName, op.key, null)
                return
            }
            op.retries = (op.retries || 0) + 1
            if (op.retries <= RETRY_MAX) retryQueue.push(op)
        })
    } else if (op.type === 'remove') {
        var itemId = op.itemId || mirror.getItemId(op.listName, op.key)
        if (!itemId) {
            // Resolve the real item_id first — deletes never use a null mark.
            fetchItemId(op.listId, op.listName, op.key, function (resolved) {
                var rid = resolved || mirror.getItemId(op.listName, op.key)
                if (rid) {
                    api.deleteListItem(op.listId, rid, function () {
                        mirror.removeItemId(op.listName, op.key)
                    }, function () {
                        op.retries = (op.retries || 0) + 1
                        if (op.retries <= RETRY_MAX) retryQueue.push(op)
                    })
                } else {
                    mirror.removeItemId(op.listName, op.key)
                }
            }, true)
            return
        }
        api.deleteListItem(op.listId, itemId, function () {
            mirror.removeItemId(op.listName, op.key)
        }, function () {
            op.retries = (op.retries || 0) + 1
            if (op.retries <= RETRY_MAX) retryQueue.push(op)
        })
    }
}

function startRetryLoop() {
    if (retryTimer) return

    retryTimer = setInterval(function () {
        if (!running || retryQueue.length === 0) return

        var batch = retryQueue.splice(0, retryQueue.length)
        for (var i = 0; i < batch.length; i++) {
            processRetryOp(batch[i])
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

// ─── Inbound polling ────────────────────────

function getPollInterval() {
    var val = Lampa.Storage.get('scrob_sync_interval', '30')
    return parseInt(val, 10) * 1000 || 30000
}

function startPolling() {
    if (pollTimer) return

    pollTimer = setInterval(function () {
        if (!running || !hasSession()) return
        // Socket-active mode invalidates via WS; polling is the fallback path.
        // Both funnel into the same update() — never two parallel writers.
        invalidate('poll')
    }, getPollInterval())
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
    }
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
                // Stop, reset mirror + tracker stamp, re-sync for new profile.
                // Mirrors core: profile_select resets tracker time/version to force a dump.
                stop()
                mirror.reset()
                mirror.clearInitialDone()
                start()
            }
        }
    }

    Lampa.Storage.listener.follow('change', profileListener)
}

// ─── Socket lifecycle ─────────────────────────────────────

// Socket open converges on a stale tracker snapshot (core socket open → update).
function onSocketOpen() {
    if (!running) return
    stopPolling()
    if (mirror.isStale(getPollInterval())) update('socket-open')
}

// Socket close resumes polling fallback.
function onSocketClose() {
    if (!running) return
    startPolling()
}

// Register WS invalidate handlers after start (core: socket open → update on stale).
function bindSocketHandlers() {
    if (!activeSocket || handlersBound) return
    bindUpdate(invalidate)
    registerHandlers(activeSocket)
    if (activeSocket.onLifecycle) {
        activeSocket.onLifecycle('open', onSocketOpen)
        activeSocket.onLifecycle('close', onSocketClose)
    }
    handlersBound = true
    // Already-connected socket with a stale tracker snapshot converges immediately.
    if (isSocketActive() && mirror.isStale(getPollInterval())) update('socket-open')
}

function unbindSocketHandlers() {
    if (activeSocket && handlersBound) {
        unregisterHandlers(activeSocket)
        if (activeSocket.offLifecycle) {
            activeSocket.offLifecycle('open', onSocketOpen)
            activeSocket.offLifecycle('close', onSocketClose)
        }
    }
    handlersBound = false
    bindUpdate(null)
}

// ─── Mapping merge (section 14.3) ─────────────────────────

// Merge a single pair: union of local category and Scrob list, REST only.
function mergePair(lampaKey, listId, listName, callback) {
    console.log('ScrobSync', 'merge pair', listName)
    api.getListItems(listId, function (scrobItems) {
        var favorite = readFavorite()
        var scrobSet = scrobElementSet(scrobItems)
        var localSet = localElementSet(favorite, lampaKey)

        // Push: localSet − scrobSet (REST only).
        var toAdd = []
        for (var k in localSet) {
            if (!scrobSet[k]) toAdd.push(k)
        }

        // Pull: scrobSet − localSet (unified applicator).
        var toPull = []
        for (var sk in scrobSet) {
            if (!localSet[sk]) toPull.push({ key: sk, media: scrobSet[sk].media })
        }

        pushRestItems(listId, listName, toAdd, 0, function () {
            for (var p = 0; p < toPull.length; p++) {
                var parsed = parseElementKey(toPull[p].key)
                applyRemoteAdd(favorite, lampaKey, parseInt(parsed.tmdbId, 10), toPull[p].media)
                mirror.setItemId(listName, toPull[p].key, scrobSet[toPull[p].key].itemId)
            }
            // Adopt server item_ids for keys the push just created (409 or fresh).
            api.getListItems(listId, function (fresh) {
                var freshSet = scrobElementSet(fresh)
                for (var fk in freshSet) {
                    mirror.setItemId(listName, fk, freshSet[fk].itemId)
                }
                writeFavorite(favorite)
                if (!mirror.getList(listName)) mirror.setList(listName, listId)
                mirror.save(mirror.get())
                callback()
            }, function () {
                writeFavorite(favorite)
                if (!mirror.getList(listName)) mirror.setList(listName, listId)
                mirror.save(mirror.get())
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
    }
    mirror.save(m)

    // Re-resolve the default [Lampa] list and reconcile via the single update() path
    api.getLists(function (serverLists) {
        var byName = {}
        for (var i = 0; i < serverLists.length; i++) {
            byName[serverLists[i].name] = serverLists[i]
        }

        if (defaultName && byName[defaultName]) {
            mirror.setList(defaultName, byName[defaultName].id)
            update('mapping-remove')
        }
        if (onDone) onDone()
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

    // Outbound: Favorite add/remove + state:changed bridge (custom keys), guarded.
    if (Lampa.Favorite && Lampa.Favorite.listener) {
        if (!Lampa.Favorite.listener.has('add', onFavoriteAdd)) {
            Lampa.Favorite.listener.follow('add,added', onFavoriteAdd)
        }
        if (!Lampa.Favorite.listener.has('remove', onFavoriteRemove)) {
            Lampa.Favorite.listener.follow('remove', onFavoriteRemove)
        }
    }
    if (Lampa.Listener && !socketPollBound) {
        socketPollBound = true
        Lampa.Listener.follow('state:changed', onStateChanged)
    }

    // Socket handlers register after start; polling stops once WS is live.
    bindSocketHandlers()
    if (isSocketActive()) stopPolling()
    else startPolling()

    setupProfileListener()
    startRetryLoop()

    // Initial sync if no mirror exists
    var m = mirror.get()
    if (Object.keys(m.lists).length === 0) {
        initialSync()
    } else if (mirror.isStale(getPollInterval())) {
        update('start-stale')
    }

    console.log('ScrobSync', 'started', { mirrorLists: Object.keys(mirror.get().lists).length })
}

// Stop the sync engine
export function stop() {
    running = false
    console.log('ScrobSync', 'stopped')

    unbindSocketHandlers()
    activeSocket = null

    if (Lampa.Favorite && Lampa.Favorite.listener) {
        Lampa.Favorite.listener.remove('add', onFavoriteAdd)
        Lampa.Favorite.listener.remove('added', onFavoriteAdd)
        Lampa.Favorite.listener.remove('remove', onFavoriteRemove)
    }
    if (Lampa.Listener && typeof Lampa.Listener.remove === 'function' && socketPollBound) {
        Lampa.Listener.remove('state:changed', onStateChanged)
        socketPollBound = null
    }

    if (profileListener) {
        Lampa.Storage.listener.remove('change', profileListener)
        profileListener = null
    }

    if (outboundTimer) {
        clearTimeout(outboundTimer)
        outboundTimer = null
    }
    if (updateTimer) {
        clearTimeout(updateTimer)
        updateTimer = null
    }
    updateRunning = false
    pushRunning = false
    pushQueue = []

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
