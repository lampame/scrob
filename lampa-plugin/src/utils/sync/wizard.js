// Scrob first-run wizard (Phase C): one-time local/server merge before sync.start().
// REST-only via api.* + mapstore/mirror public API; engine internals stay private.
import * as api from '../api'
import { KEYS, hasSession, backupKey } from '../storage'
import {
    listNameForKey, syncableKeys, parseElementKey,
    localElementSet, scrobElementSet, applyRemoteAdd, cardFromScrobMedia, isMarkKey
} from './mapping'
import * as mapstore from './mapstore'
import * as mirror from './mirror'
import * as custom from './custom'
import { start as syncStart, detectConflicts } from './engine'

// Snapshot TTL: rollback button lives 7 days (spec 5.1, step 0).
var BACKUP_TTL = 7 * 24 * 3600 * 1000
var PUSH_PAUSE = 150

function currentPid() {
    return Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default'
}

function doneKey(p) { return 'scrob_wizard_done_' + p }
function tsKey(p) { return backupKey(p, 'favorite') + '_ts' }
function t(key) { return Lampa.Lang.translate(key) }

function parseFavorite(raw) {
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch (e) { return {} } }
    return raw || {}
}

function readFavorite() {
    var fav = parseFavorite(Lampa.Storage.get('favorite', '{}'))
    if (!fav.card) fav.card = []
    return fav
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function needsWizard(p) {
    p = p || currentPid()
    return !Lampa.Storage.get(doneKey(p))
}

export function hasWizardBackup(p) {
    p = p || currentPid()
    var raw = Lampa.Storage.get(backupKey(p, 'favorite'), 'none')
    if (raw === 'none' || !raw) return false
    var ts = parseInt(Lampa.Storage.get(tsKey(p), '0'), 10) || 0
    return (Date.now() - ts) < BACKUP_TTL
}

export function restoreWizardBackup(p) {
    p = p || currentPid()
    if (!hasWizardBackup(p)) return false
    Lampa.Storage.set('favorite', Lampa.Storage.get(backupKey(p, 'favorite')))
    try { if (Lampa.Favorite && Lampa.Favorite.read) Lampa.Favorite.read() } catch (e) {}
    try { if (Lampa.Timeline && Lampa.Timeline.read) Lampa.Timeline.read() } catch (e) {}
    return true
}

function markDone() {
    Lampa.Storage.set(doneKey(currentPid()), true)
}

function maybeStartSync() {
    if (Lampa.Storage.get(KEYS.SYNC_ENABLED)) syncStart()
}

// ─── Inventory (step 2) ───────────────────────────────────
// One row per non-empty pair: { lampaKey, listName, listId, local, remote, both, localSet, remoteSet }.
export function previewAll(onDone) {
    var favorite = readFavorite()
    var map = mapstore.getMap()
    api.getLists(function (serverLists) {
        var byId = {}, byName = {}
        for (var s = 0; s < serverLists.length; s++) {
            byId[serverLists[s].id] = serverLists[s]
            if (serverLists[s].name) byName[serverLists[s].name] = serverLists[s]
        }
        var keys = syncableKeys(favorite)
        var rows = []
        var i = 0
        function next() {
            if (i >= keys.length) { onDone(rows); return }
            var key = keys[i++]
            var name = null, list = null
            var m = map[key]
            if (m && m.list_id != null) {
                list = byId[m.list_id] || (m.list_name ? byName[m.list_name] : null) || null
                name = (list && list.name) || m.list_name || listNameForKey(key)
            } else {
                name = listNameForKey(key)
                if (name && byName[name]) list = byName[name]
            }
            if (!name) { next(); return }
            var localSet = localElementSet(favorite, key)
            var localCount = Object.keys(localSet).length
            function pushRow(remoteSet, listId) {
                var rkeys = Object.keys(remoteSet)
                var both = 0
                for (var k = 0; k < rkeys.length; k++) if (localSet[rkeys[k]]) both++
                if (localCount === 0 && rkeys.length === 0) { next(); return }
                rows.push({ lampaKey: key, listName: name, listId: listId, local: localCount, remote: rkeys.length, both: both, localSet: localSet, remoteSet: remoteSet })
                next()
            }
            if (!list) { pushRow({}, null); return }
            api.getListItems(list.id, function (items) {
                pushRow(scrobElementSet(Array.isArray(items) ? items : []), list.id)
            }, function () { pushRow({}, list.id) })
        }
        next()
    }, function () { onDone([]) })
}

// ─── Flow (steps 0–7) ─────────────────────────────────────

export function runWizard() {
    if (!hasSession()) return
    var conflicts = detectConflicts()
    for (var c = 0; c < conflicts.length; c++) {
        if (conflicts[c].type === 'cub_sync') { Lampa.Noty.show(t('scrob_sync_blocked_cub')); return }
    }
    // Step 0 — snapshot before anything writes.
    var p = currentPid()
    Lampa.Storage.set(backupKey(p, 'favorite'), Lampa.Storage.get('favorite', '{}'))
    Lampa.Storage.set(tsKey(p), Date.now())
    // Step 1 — welcome: union default, nothing deleted without confirm.
    Lampa.Modal.open({
        title: t('scrob_wizard_title'),
        html: $('<div><div style="padding:1em;line-height:1.6">' + escapeHtml(t('scrob_wizard_welcome')) + '</div></div>'),
        size: 'medium',
        buttons: [
            { name: t('scrob_map_cancel'), onSelect: function () { Lampa.Modal.close() } },
            { name: t('scrob_wizard_start'), onSelect: function () { Lampa.Modal.close(); inventoryStep() } }
        ]
    })
}

function inventoryStep() {
    Lampa.Noty.show(t('scrob_wizard_loading'))
    previewAll(function (rows) {
        if (!rows.length) { Lampa.Noty.show(t('scrob_wizard_empty')); markDone(); maybeStartSync(); return }
        globalModeStep(rows)
    })
}

// Step 3 — global mode; non-merge modes skip per-pair questions.
function globalModeStep(rows) {
    var modes = ['merge', 'push', 'pull', 'later']
    var labels = { merge: t('scrob_wizard_merge'), push: t('scrob_wizard_push'), pull: t('scrob_wizard_pull'), later: t('scrob_wizard_later') }
    Lampa.Select.show({
        title: t('scrob_wizard_mode'),
        items: modes.map(function (m) { return { title: labels[m], _mode: m, selected: m === 'merge' } }),
        onSelect: function (a) {
            if (a._mode === 'merge') {
                var conflicts = rows.filter(function (r) { return r.local > 0 && r.remote > 0 && r.both < r.local + r.remote })
                pairSteps(conflicts, rows, a._mode, {}, 0)
            } else {
                customStep(rows, { global: a._mode, per: {} })
            }
        }
    })
}

// Step 4 — per conflicting pair; marks offer keep-only (union breaks toggle()).
function pairSteps(list, rows, global, per, idx) {
    if (idx >= list.length) { customStep(rows, { global: global, per: per }); return }
    var row = list[idx]
    var mark = isMarkKey(row.lampaKey)
    var items = []
    if (!mark) items.push({ title: t('scrob_wizard_merge'), _mode: 'merge', selected: true })
    items.push({ title: t('scrob_wizard_keep_lampa') + (mark ? ' — ' + t('scrob_map_marks_warn') : ''), _mode: 'push', selected: mark })
    items.push({ title: t('scrob_wizard_keep_scrob'), _mode: 'pull' })
    Lampa.Select.show({
        title: row.listName + ': ' + row.local + ' + ' + row.remote + ' → ?',
        items: items,
        onSelect: function (a) { per[row.lampaKey] = a._mode; pairSteps(list, rows, global, per, idx + 1) }
    })
}

// Step 5 — levende custom_favorite: import as favorite keys or skip.
function findCustom() {
    var raw = Lampa.Storage.get('custom_favorite', 'none')
    var cf = parseFavorite(raw === 'none' ? null : raw)
    if (!cf || typeof cf !== 'object') return null
    var types = cf.customTypes || cf.custom_types || null
    if (!types || typeof types !== 'object') return null
    var names = []
    for (var k in types) {
        if (k === 'card' || k === 'cards' || k === 'migrationVersion' || k === 'migration_version') continue
        names.push(k)
    }
    if (!names.length) return null
    return { data: cf, types: types, names: names }
}

function customStep(rows, plan) {
    var found = findCustom()
    if (!found) { confirmStep(rows, plan, 'skip'); return }
    Lampa.Select.show({
        title: t('scrob_wizard_custom_title') + ' (' + found.names.length + ')',
        items: [
            { title: t('scrob_wizard_custom_import'), _mode: 'import', selected: true },
            { title: t('scrob_wizard_custom_skip'), _mode: 'skip' }
        ],
        onSelect: function (a) { confirmStep(rows, plan, a._mode) }
    })
}

// Step 6 — confirm: `N + M → P` lines.
function strategyOf(plan, key) { return plan.per[key] || plan.global }

function resultCount(row, strategy) {
    if (strategy === 'merge') return row.local + row.remote - row.both
    if (strategy === 'push') return row.local
    if (strategy === 'pull') return row.remote
    return row.local
}

function confirmStep(rows, plan, customMode) {
    plan.customMode = customMode
    plan.rows = rows
    var html = ''
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        var s = strategyOf(plan, r.lampaKey)
        var line = escapeHtml(r.listName) + ': ' + r.local + ' + ' + r.remote + ' → ' + resultCount(r, s)
        if (s === 'later') line += ' (' + escapeHtml(t('scrob_wizard_later')) + ')'
        if (r.lampaKey === 'person') line += '<br><span style="opacity:0.6">' + escapeHtml(t('scrob_wizard_person_warn')) + '</span>'
        html += '<div style="padding:0.2em 0">' + line + '</div>'
    }
    Lampa.Modal.open({
        title: t('scrob_wizard_confirm'),
        html: $('<div><div style="padding:1em;line-height:1.6">' + html + '</div></div>'),
        size: 'medium',
        buttons: [
            { name: t('scrob_map_cancel'), onSelect: function () { Lampa.Modal.close() } },
            { name: t('scrob_wizard_apply'), onSelect: function () { Lampa.Modal.close(); Lampa.Noty.show(t('scrob_wizard_loading')); applyAll(plan) } }
        ]
    })
}

// ─── Apply (step 7) ───────────────────────────────────────
// One favorite mutation object across all rows, a single Storage.set at the end.
export function applyAll(plan, onDone) {
    var favorite = readFavorite()
    var rows = plan.rows || []
    var i = 0
    function next() {
        if (i >= rows.length) {
            applyCustom(favorite, plan.customMode)
            Lampa.Storage.set('favorite', favorite)
            try { if (Lampa.Favorite && Lampa.Favorite.read) Lampa.Favorite.read() } catch (e) {}
            markDone()
            Lampa.Noty.show(t('scrob_wizard_done'))
            maybeStartSync()
            if (onDone) onDone()
            return
        }
        var row = rows[i++]
        var strategy = strategyOf(plan, row.lampaKey)
        if (strategy === 'later') { next(); return }
        applyRow(row, strategy, favorite, next)
    }
    next()
}

function applyRow(row, strategy, favorite, done) {
    function withList(cb) {
        if (row.listId) { cb(row.listId); return }
        api.createList(row.listName, function (created) {
            row.listId = created.id
            mapstore.setMapping(row.lampaKey, created.id, row.listName)
            mirror.setList(row.listName, created.id)
            cb(created.id)
        }, done)
    }
    withList(function (listId) {
        var pushKeys = []
        if (strategy === 'merge' || strategy === 'push') {
            for (var k in row.localSet) if (!row.remoteSet[k]) pushKeys.push(k)
        }
        pushSerial(listId, row, pushKeys, 0, {}, function (pushedIds) {
            if (strategy === 'pull') favorite[row.lampaKey] = []
            if (strategy === 'merge' || strategy === 'pull') {
                for (var k2 in row.remoteSet) {
                    if (strategy === 'merge' && row.localSet[k2]) continue
                    var parsed = parseElementKey(k2)
                    applyRemoteAdd(favorite, row.lampaKey, parseInt(parsed.tmdbId, 10), row.remoteSet[k2].media)
                }
            }
            mapstore.setMapping(row.lampaKey, listId, row.listName)
            mirror.setList(row.listName, listId)
            var union = {}
            for (var a in row.localSet) union[a] = true
            for (var b in row.remoteSet) union[b] = true
            for (var u in union) {
                mirror.setItemId(row.listName, u, row.remoteSet[u] ? row.remoteSet[u].itemId : (pushedIds[u] || null))
            }
            done()
        })
    })
}

// Serial push with 150ms pause (engine pushRestItems pattern); best-effort —
// failures converge later via steady-state sync, the plan never stalls on one row.
function pushSerial(listId, row, keys, idx, pushedIds, cb) {
    if (idx >= keys.length) { cb(pushedIds); return }
    var parts = parseElementKey(keys[idx])
    var tmdbId = parseInt(parts.tmdbId, 10)
    if (!tmdbId) { pushSerial(listId, row, keys, idx + 1, pushedIds, cb); return }
    function step() { pushSerial(listId, row, keys, idx + 1, pushedIds, cb) }
    api.addListItem(listId, tmdbId, parts.mediaType, function (resp) {
        pushedIds[keys[idx]] = (resp && resp.id) || null
        setTimeout(step, PUSH_PAUSE)
    }, function () {
        pushedIds[keys[idx]] = null
        setTimeout(step, PUSH_PAUSE)
    })
}

function sanitizeKey(name) {
    return String(name || '').trim().toLowerCase()
        .replace(/[^\wа-яіїєґё]+/gi, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32)
}

// Custom import: minimal copy of levende mergeCard/mergeCategory (union, no deletes).
function applyCustom(favorite, mode) {
    if (mode !== 'import') return
    var found = findCustom()
    if (!found) return
    var pool = []
    if (Array.isArray(found.types.card)) pool = found.types.card
    else if (Array.isArray(found.data.card)) pool = found.data.card
    for (var n = 0; n < found.names.length; n++) {
        var name = found.names[n]
        var val = found.types[name]
        var uid = (typeof val === 'string') ? val : ((val && (val.uid || val.id)) || name)
        var ids = found.data[uid]
        if (!Array.isArray(ids) || !ids.length) continue
        var key = sanitizeKey(name)
        if (!key || key === 'card' || key === 'history' || key === 'viewed') continue
        if (!Array.isArray(favorite[key])) favorite[key] = []
        if (!Array.isArray(favorite.card)) favorite.card = []
        for (var i = 0; i < ids.length; i++) {
            if (favorite[key].indexOf(ids[i]) === -1) favorite[key].push(ids[i])
            var has = false
            for (var c = 0; c < favorite.card.length; c++) {
                if (favorite.card[c].id == ids[i]) { has = true; break }
            }
            if (!has) {
                var src = null
                for (var p = 0; p < pool.length; p++) {
                    if (pool[p].id == ids[i]) { src = pool[p]; break }
                }
                if (src) { favorite.card.push(Object.assign({}, src)); continue }
                var num = parseInt(ids[i], 10)
                favorite.card.push((num && cardFromScrobMedia({ tmdb_id: num, type: 'movie', title: String(ids[i]) })) ||
                    { id: ids[i], method: 'movie', title: String(ids[i]), poster_path: '' })
            }
        }
        custom.add(key, name)
    }
}
