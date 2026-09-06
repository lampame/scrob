// Scrob — Lampa plugin: login to a self-hosted Scrob server,
// switch between server users as profiles, isolate watch data per profile.
import addLang from './lang'
import * as api from './utils/api'
import { scrobSocketInit, scrobSocketDisconnect, getScrobSocket } from './utils/socket'
import * as sync from './utils/sync'
import { KEYS, hasSession, getMe, getProfiles, activeProfile, clearSession, serverUrl } from './utils/storage'
import { avatarHtml, switchProfile } from './utils/profiles'
import * as custom from './utils/sync/custom'
import CategoryComponent from './component/category'

// Settings section icon (gradient ids prefixed scrob- to avoid conflicts)
var ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 419 454"><defs><linearGradient id="scrobRingGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="454"><stop offset="0%" stop-color="#5B34D6"/><stop offset="50%" stop-color="#9E3BC1"/><stop offset="100%" stop-color="#C147D8"/></linearGradient><linearGradient id="scrobDotGrad" gradientUnits="objectBoundingBox" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#5B34D6"/><stop offset="100%" stop-color="#C147D8"/></linearGradient></defs><path d="M 394.09 73.88 A 226.5 226.5 0 1 0 332.74 427.26 L 287.64 358.22 A 144.6 144.6 0 1 1 334.56 130.14 Z" fill="url(#scrobRingGrad)"/><circle cx="368.97" cy="347.2" r="48.29" fill="url(#scrobDotGrad)"/></svg>`

var settingsListener = null

// stop() of the currently-active QR pairing poll, so a repeat call to
// openQrAuthDialog() (without closing the previous modal) silences the old
// loop instead of running two in parallel.
var scrobQrStopActive = null

// Refreshes early — refreshDeviceToken() rotates the refresh_token too, so a
// buffer avoids clock-drift/sleep making a request land right past expiry.
var DEVICE_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

// ─── Header profile button ────────────────────────────────

function removeHeaderButton() {
    $('.open--scrob-profile').remove()
}

// Render avatar button after open--settings (pattern: siaivo birthday.js)
function renderHeaderButton() {
    removeHeaderButton()

    var btn = $('<div class="head__action selector open--scrob-profile"></div>')

    btn.append(avatarHtml(activeProfile()))
    btn.on('hover:enter', showProfileSelect)

    $('.head .head__actions .open--settings').after(btn)
}

function updateHeaderButton() {
    if (hasSession()) renderHeaderButton()
    else removeHeaderButton()
}

// Profile picker (pattern: siaivo/src/core/account/profile.js select())
function showProfileSelect() {
    var profiles = getProfiles()

    if (!profiles.length) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_profiles_empty'))
        return
    }

    var activeId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID)

    var items = profiles.map(function (u) {
        return {
            title: u.username,
            subtitle: u.email || '',
            template: 'selectbox_icon',
            icon: avatarHtml(u),
            selected: u.id == activeId,
            id: u.id
        }
    })

    Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_profiles'),
        items: items,
        onSelect: function (a) {
            if (switchProfile(a.id)) renderHeaderButton()
        }
    })
}

// ─── Login / logout ───────────────────────────────────────

function refreshSettings() {
    if (typeof Lampa.Settings !== 'undefined' && typeof Lampa.Settings.update === 'function') {
        Lampa.Settings.update()
    }
}

// Save session, load profile list, draw header button
function completeLogin(token, me, username, password) {
    Lampa.Storage.set(KEYS.ACCESS_TOKEN, token)
    Lampa.Storage.set(KEYS.ME, me)
    Lampa.Storage.set(KEYS.OWN_API_KEY, me.api_key || '')
    Lampa.Storage.set(KEYS.ACTIVE_PROFILE_ID, me.id)
    Lampa.Storage.set(KEYS.ACTIVE_API_KEY, me.api_key || '')
    // Store credentials for socket re-authentication
    if (username) Lampa.Storage.set(KEYS.USERNAME, username)
    if (password) Lampa.Storage.set(KEYS.PASSWORD, password)

    var finish = function (profiles) {
        Lampa.Storage.set(KEYS.PROFILES, profiles)
        renderHeaderButton()
        refreshCustomMenu()
        refreshSettings()
        Lampa.Noty.show(Lampa.Lang.translate('scrob_auth_success'))

        // Start sync if enabled (lifecycle wiring)
        if (Lampa.Storage.get(KEYS.SYNC_ENABLED)) sync.start()
    }

    if (me.is_admin) {
        // Admin gets all server users as profiles; on failure fall back to own profile only
        api.adminUsers(token, finish, function () {
            finish([me])
        })
    } else {
        finish([me])
    }
}

// Lampa.Input.edit's own back() hardcodes returning focus to
// 'settings_component' regardless of caller — every terminal branch here
// explicitly overrides that with Controller.toggle(returnTo).
function performServerLogin(username, password, returnTo) {
    returnTo = returnTo || 'settings_component'

    if (!serverUrl()) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_fill_fields'))
        Lampa.Controller.toggle(returnTo)
        return
    }

    api.login(username, password, function (token) {
        if (token.requires_2fa) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_2fa_not_supported'))
            Lampa.Controller.toggle(returnTo)
            return
        }

        api.me(token.access_token, function (me) {
            completeLogin(token.access_token, me, username, password)
            Lampa.Controller.toggle(returnTo)
        }, function () {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_me_error'))
            Lampa.Controller.toggle(returnTo)
        })
    }, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_auth_error'))
        Lampa.Controller.toggle(returnTo)
    })
}

// Two chained Input.edit dialogs (username, then password) — mirrors the
// standalone Scrob Lampa plugin's openAuthDialog() (scrob.js).
function openLoginInputFlow(returnTo) {
    returnTo = returnTo || 'settings_component'

    Lampa.Input.edit({
        title: Lampa.Lang.translate('scrob_username'),
        value: '',
        free: true,
        nosave: true
    }, function (username) {
        if (!username || !username.trim()) { Lampa.Controller.toggle(returnTo); return }

        Lampa.Input.edit({
            title: Lampa.Lang.translate('scrob_password'),
            value: '',
            free: true,
            nosave: true
        }, function (password) {
            if (!password || !password.trim()) { Lampa.Controller.toggle(returnTo); return }

            performServerLogin(username.trim(), password.trim(), returnTo)
        })
    })
}

// Manual API key — standalone auth method, no login required at all.
function openApiKeyInput(returnTo) {
    returnTo = returnTo || 'settings_component'

    Lampa.Input.edit({
        title: Lampa.Lang.translate('scrob_api_key'),
        value: Lampa.Storage.get(KEYS.OWN_API_KEY, ''),
        free: true,
        nosave: true
    }, function (value) {
        Lampa.Storage.set(KEYS.OWN_API_KEY, (value || '').trim())
        updateHeaderButton()
        refreshSettings()
        Lampa.Controller.toggle(returnTo)
    })
}

// Entry point: one settings row → three standalone sign-in methods, matching
// the standalone Scrob Lampa plugin's own choice menu (scrob.js
// openAuthChoiceDialog()) instead of three permanently-visible input fields.
function showAuthChoice(returnTo) {
    returnTo = returnTo || 'settings_component'

    Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_auth_choice_title'),
        items: [
            { title: Lampa.Lang.translate('scrob_api_key'), action: 'apikey' },
            { title: Lampa.Lang.translate('scrob_login'), action: 'login' },
            { title: Lampa.Lang.translate('scrob_qr_login'), action: 'qr' }
        ],
        onSelect: function (item) {
            if (item.action === 'apikey') openApiKeyInput(returnTo)
            else if (item.action === 'login') openLoginInputFlow(returnTo)
            else if (item.action === 'qr') openQrAuthDialog(returnTo)
        },
        onBack: function () {
            Lampa.Controller.toggle(returnTo)
        }
    })
}

function doLogout() {
    // Stop sync before clearing session (lifecycle wiring)
    sync.stop()

    clearSession()
    removeHeaderButton()
    refreshSettings()
    Lampa.Noty.show(Lampa.Lang.translate('scrob_logout_success'))
}

// ─── QR device pairing (third, standalone sign-in method) ──
// Bearer device token, never an api_key — the backend deliberately refuses
// /auth/me for device-scoped tokens (see KEYS.DEVICE_ACCESS_TOKEN in
// storage.js), so admin profile-switching stays login-only; this path is for
// plain scrobbling/sync without ever typing a password on the TV remote.

function openQrAuthDialog(returnTo) {
    returnTo = returnTo || 'settings_component'

    api.deviceCode(function (data) {
        showQrAuthModal(data, returnTo)
    }, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_noty_qr_gen_failed'))
    })
}

function showQrAuthModal(data, returnTo) {
    // A repeat call without closing the previous modal would otherwise stack
    // parallel polling loops.
    if (scrobQrStopActive) { scrobQrStopActive(); scrobQrStopActive = null }

    var pollDelay = (data.interval || 5) * 1000
    var expiresAt = Date.now() + (data.expires_in || 900) * 1000
    var pollTimeout = null
    var stopped = false

    function stopPolling() {
        stopped = true
        if (pollTimeout) { clearTimeout(pollTimeout); pollTimeout = null }
        if (scrobQrStopActive === stopPolling) scrobQrStopActive = null
    }
    scrobQrStopActive = stopPolling

    var $html = $(
        '<div class="scrob-qr-wrap">' +
            '<div class="scrob-qr-code"></div>' +
            '<div class="scrob-qr-user-code"></div>' +
            '<div class="scrob-qr-hint">' + Lampa.Lang.translate('scrob_qr_hint') + '</div>' +
            '<div class="scrob-qr-manual"></div>' +
        '</div>'
    )
    $html.find('.scrob-qr-user-code').text(data.user_code) // .text() — без ризику інʼєкції в HTML
    if (data.verification_uri) {
        // verification_uri — те саме посилання, що зашите в QR (без коду), готове
        // від сервера; не збираємо його самі з serverUrl(), щоб не розійтися з
        // реальним server_url Scrob.
        $html.find('.scrob-qr-manual').text(
            Lampa.Lang.translate('scrob_qr_manual_prefix') + data.verification_uri + Lampa.Lang.translate('scrob_qr_manual_suffix')
        )
    }

    Lampa.Utils.qrcode(data.verification_uri_complete, $html.find('.scrob-qr-code'), function () {
        $html.find('.scrob-qr-code').text(Lampa.Lang.translate('scrob_qr_draw_failed'))
    })

    Lampa.Modal.open({
        title: Lampa.Lang.translate('scrob_qr_modal_title'),
        html: $html,
        onBack: function () {
            stopPolling()
            Lampa.Modal.close()
            Lampa.Controller.toggle(returnTo)
        }
    })

    function poll() {
        if (stopped) return
        if (Date.now() > expiresAt) {
            stopPolling()
            Lampa.Modal.close()
            Lampa.Noty.show(Lampa.Lang.translate('scrob_noty_qr_expired'))
            return
        }

        api.deviceToken(data.device_code, function (res) {
            if (stopped) return
            if (res.ok && res.body.access_token) {
                stopPolling()
                Lampa.Storage.set(KEYS.DEVICE_ACCESS_TOKEN, res.body.access_token)
                Lampa.Storage.set(KEYS.DEVICE_REFRESH_TOKEN, res.body.refresh_token)
                Lampa.Storage.set(KEYS.DEVICE_EXPIRES_AT, Date.now() + res.body.expires_in * 1000)
                Lampa.Modal.close()
                Lampa.Noty.show(Lampa.Lang.translate('scrob_auth_success'))
                renderHeaderButton()
                refreshSettings()
                Lampa.Controller.toggle(returnTo)
                return
            }

            var err = res.body.error
            if (err === 'slow_down') pollDelay += 5000 // сервер просить пул рідше
            if (err === 'access_denied' || err === 'expired_token' || err === 'invalid_grant') {
                stopPolling()
                Lampa.Modal.close()
                Lampa.Noty.show(Lampa.Lang.translate('scrob_noty_qr_denied'))
                return
            }
            // 'authorization_pending' (чи щось незнайоме) — мовчки продовжуємо пул
            pollTimeout = setTimeout(poll, pollDelay)
        }, function () {
            // тимчасова мережева помилка одного пулу — цикл не зупиняємо
            if (!stopped) pollTimeout = setTimeout(poll, pollDelay)
        })
    }

    pollTimeout = setTimeout(poll, pollDelay)
}

// Rotates refresh_token on every call (server design) — always store the new
// one. Clears the pairing ONLY on an explicit server refusal (grant revoked
// or a replayed/stale refresh_token), never on a plain network failure, so a
// temporary connectivity blip can't sign the device out on its own.
function refreshDeviceToken(callback) {
    var refreshToken = Lampa.Storage.get(KEYS.DEVICE_REFRESH_TOKEN, '')
    if (!refreshToken) { if (callback) callback(false); return }

    api.deviceTokenRefresh(refreshToken, function (res) {
        if (res.ok && res.body.access_token) {
            Lampa.Storage.set(KEYS.DEVICE_ACCESS_TOKEN, res.body.access_token)
            Lampa.Storage.set(KEYS.DEVICE_REFRESH_TOKEN, res.body.refresh_token)
            Lampa.Storage.set(KEYS.DEVICE_EXPIRES_AT, Date.now() + res.body.expires_in * 1000)
            if (callback) callback(true)
        } else {
            Lampa.Storage.set(KEYS.DEVICE_ACCESS_TOKEN, '')
            Lampa.Storage.set(KEYS.DEVICE_REFRESH_TOKEN, '')
            Lampa.Storage.set(KEYS.DEVICE_EXPIRES_AT, 0)
            updateHeaderButton()
            refreshSettings()
            if (callback) callback(false)
        }
    }, function () {
        if (callback) callback(false)
    })
}

// Proactive check, called periodically — see the setInterval in startPlugin().
function ensureDeviceTokenFresh() {
    var token = Lampa.Storage.get(KEYS.DEVICE_ACCESS_TOKEN, '')
    if (!token) return
    var expiresAt = Lampa.Storage.get(KEYS.DEVICE_EXPIRES_AT, 0)
    if (Date.now() < expiresAt - DEVICE_TOKEN_REFRESH_BUFFER_MS) return
    refreshDeviceToken()
}

// ─── Settings section ─────────────────────────────────────

// Mark categories — mutually exclusive statuses
var MARK_CATS = ['scheduled', 'continued', 'thrown', 'look', 'viewed']

// Lampa favorite category translation keys (from core)
var CAT_LABELS = {
    book: 'title_book',
    like: 'title_like',
    wath: 'title_wath',
    scheduled: 'title_scheduled',
    continued: 'title_continued',
    thrown: 'title_thrown',
    look: 'title_look',
    viewed: 'title_viewed'
}

function catLabel(key) {
    var translationKey = CAT_LABELS[key]
    if (translationKey) return Lampa.Lang.translate(translationKey)
    // Custom key: capitalize
    return key.charAt(0).toUpperCase() + key.slice(1)
}

// Sanitize category name into a storage key
function sanitizeCategoryKey(name) {
    var key = String(name || '').trim().toLowerCase()
        .replace(/[^\wа-яіїєґё]+/gi, '_')   // letters/digits/underscore only
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32)
    return key
}

// Menu icon SVG for custom categories (folder/list icon, stroke currentColor)
var MENU_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'

// ─── Mapping flow ─────────────────────────────────────────

function showMappingFlow() {
    if (!hasSession()) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_fill_fields'))
        return
    }

    // Fetch all lists from server
    api.getLists(function (serverLists) {
        // Filter: exclude [Lampa] lists and already-mapped lists
        var mappedIds = sync.getMappedIds()
        var available = []
        for (var i = 0; i < serverLists.length; i++) {
            var sl = serverLists[i]
            if (!sl.name) continue
            if (sl.name.indexOf('[Lampa] ') === 0) continue
            if (mappedIds.indexOf(sl.id) !== -1) continue
            available.push(sl)
        }

        if (available.length === 0) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_map_none'))
            return
        }

        // Select #1: choose Scrob list
        var listItems = available.map(function (sl) {
            return {
                title: sl.name,
                subtitle: (sl.item_count || 0) + ' items',
                id: sl.id,
                list_name: sl.name
            }
        })

        Lampa.Select.show({
            title: Lampa.Lang.translate('scrob_map_select_list'),
            items: listItems,
            onSelect: function (selectedList) {
                showCategorySelect(selectedList)
            }
        })
    }, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_lists_error'))
    })
}

function showCategorySelect(selectedList) {
    // Build category list: standard keys + custom keys from favorite
    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
    }

    var standardKeys = ['book', 'like', 'wath', 'scheduled', 'continued', 'thrown', 'look']
    var existingMap = sync.getMap()
    var catItems = []

    // First item: create own category
    catItems.push({
        title: Lampa.Lang.translate('scrob_map_create_own'),
        icon: MENU_ICON_SVG,
        _create_own: true
    })

    // Standard categories
    for (var i = 0; i < standardKeys.length; i++) {
        var key = standardKeys[i]
        var label = catLabel(key)
        var mapping = existingMap[key]

        if (mapping) {
            label += ' (' + Lampa.Lang.translate('scrob_map_replace') + ': ' + mapping.list_name + ')'
        }

        catItems.push({
            title: label,
            id: key,
            _isMark: MARK_CATS.indexOf(key) !== -1
        })
    }

    // Custom keys from favorite (not standard, not excluded)
    var excluded = { card: true, history: true, viewed: true }
    for (var k in favorite) {
        if (excluded[k] || standardKeys.indexOf(k) !== -1 || !Array.isArray(favorite[k])) continue
        var customLabel = k.charAt(0).toUpperCase() + k.slice(1)
        var customMapping = existingMap[k]

        if (customMapping) {
            customLabel += ' (' + Lampa.Lang.translate('scrob_map_replace') + ': ' + customMapping.list_name + ')'
        }

        catItems.push({
            title: customLabel,
            id: k,
            _isMark: false
        })
    }

    Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_map_select_cat'),
        items: catItems,
        onSelect: function (selectedCat) {
            if (selectedCat._create_own) {
                showCreateOwnInput(selectedList)
            } else {
                showConfirmMapping(selectedList, selectedCat)
            }
        }
    })
}

// Reserved keys that cannot be used as custom category names
var RESERVED_KEYS = ['card', 'history', 'viewed', 'persons', 'like', 'wath', 'book', 'look', 'scheduled', 'continued', 'thrown']

// Input flow for creating a custom category
function showCreateOwnInput(selectedList) {
    Lampa.Input.edit({
        title: Lampa.Lang.translate('scrob_map_own_name'),
        value: selectedList.list_name || '',
        free: true,
        nosave: true,
        align: 'center'
    }, function (value) {
        var name = String(value || '').trim()
        var key = sanitizeCategoryKey(name)

        if (!key) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'))
            showCreateOwnInput(selectedList)
            return
        }

        // Check reserved keys
        if (RESERVED_KEYS.indexOf(key) !== -1) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'))
            showCreateOwnInput(selectedList)
            return
        }

        // Check custom registry
        if (custom.getByKey(key)) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'))
            showCreateOwnInput(selectedList)
            return
        }

        // Check existing favorite keys
        var favorite = Lampa.Storage.get('favorite', '{}')
        if (typeof favorite === 'string') {
            try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
        }
        if (favorite[key] && Array.isArray(favorite[key])) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'))
            showCreateOwnInput(selectedList)
            return
        }

        // Create category in favorite storage
        favorite[key] = []
        Lampa.Storage.set('favorite', favorite)

        // Register custom category
        custom.add(key, name)

        // Apply mapping: pull items from Scrob list into new category
        sync.applyMapping(key, selectedList.id, selectedList.list_name, function () {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_created'))
            refreshCustomMenu()
            refreshSettings()
        })
    })
}

function showConfirmMapping(selectedList, selectedCat) {
    var html = $('<div>' +
        '<div style="padding:1em; line-height:1.6">' +
        '"' + selectedList.list_name + '" ' +
        Lampa.Lang.translate('scrob_map_confirm') + ' "' +
        catLabel(selectedCat.id) + '"<br>' +
        '<span style="opacity:0.6">' + Lampa.Lang.translate('scrob_map_once') + '</span>' +
        (selectedCat._isMark ?
            '<br><span style="color:#e8a838">' + Lampa.Lang.translate('scrob_map_marks_warn') + '</span>' : '') +
        '</div></div>')

    Lampa.Modal.open({
        title: Lampa.Lang.translate('scrob_map_title'),
        html: html,
        size: 'medium',
        buttons: [
            {
                name: Lampa.Lang.translate('scrob_map_cancel'),
                onSelect: function () { Lampa.Modal.close() }
            },
            {
                name: Lampa.Lang.translate('scrob_map_apply'),
                onSelect: function () {
                    Lampa.Modal.close()
                    sync.applyMapping(
                        selectedCat.id,
                        selectedList.id,
                        selectedList.list_name,
                        function () {
                            // Success: refresh settings to update active mappings button
                            refreshSettings()
                        }
                    )
                }
            }
        ]
    })
}

// ─── Active mappings management ───────────────────────────

function showActiveMappings() {
    var map = sync.getMap()
    var keys = Object.keys(map)

    if (keys.length === 0) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_map_none'))
        return
    }

    var items = keys.map(function (key) {
        return {
            title: catLabel(key) + ' → ' + map[key].list_name,
            _lampaKey: key,
            _listId: map[key].list_id,
            _listName: map[key].list_name
        }
    })

    Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_map_active'),
        items: items,
        onSelect: function (selected) {
            showMappingActions(selected)
        }
    })
}

function showMappingActions(mappingEntry) {
    Lampa.Select.show({
        title: mappingEntry.title,
        items: [
            { title: Lampa.Lang.translate('scrob_map_unlink'), _action: 'unlink' },
            { title: Lampa.Lang.translate('scrob_map_cancel'), _action: 'cancel' }
        ],
        onSelect: function (item) {
            if (item._action === 'unlink') {
                sync.removeMappingFlow(mappingEntry._lampaKey, function () {
                    Lampa.Noty.show(Lampa.Lang.translate('scrob_map_unlinked'))
                    refreshSettings()
                })
            }
            // 'cancel' — just close, Select auto-closes
        }
    })
}

// ─── Dynamic custom category menu items ───────────────────

function refreshCustomMenu() {
    // Remove previous custom menu items
    $('.menu .menu__list .scrob-custom-menu-item').remove()

    var categories = custom.getAll()
    if (!categories.length) return

    for (var i = 0; i < categories.length; i++) {
        var cat = categories[i]

        var button = $(
            '<li class="menu__item selector scrob-custom-menu-item" data-key="' + cat.key + '">' +
                '<div class="menu__ico">' + MENU_ICON_SVG + '</div>' +
                '<div class="menu__text">' + cat.title + '</div>' +
            '</li>'
        )

        button.on('hover:enter', (function (c) {
            return function () {
                Lampa.Activity.push({
                    url: '',
                    title: c.title,
                    component: 'scrob_category',
                    custom_key: c.key,
                    page: 1
                })
            }
        })(cat))

        $('.menu .menu__list').eq(0).append(button)
    }
}

// ─── Bookmarks ContentRows for custom categories ─────────

function registerBookmarksRows() {
    try {
        Lampa.ContentRows.add({
            name: 'scrob_custom_categories',
            title: Lampa.Lang.translate('scrob_title'),
            index: 90,
            screen: ['bookmarks'],
            call: function (params, screen) {
                var categories = custom.getAll()
                if (!categories || !categories.length) return

                var favorite = Lampa.Storage.get('favorite', '{}')
                if (typeof favorite === 'string') {
                    try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
                }

                var cards = Array.isArray(favorite.card) ? favorite.card : []
                var lines = []

                for (var i = 0; i < categories.length; i++) {
                    var cat = categories[i]
                    var ids = Array.isArray(favorite[cat.key]) ? favorite[cat.key] : []

                    var results = []
                    for (var j = 0; j < ids.length; j++) {
                        for (var k = 0; k < cards.length; k++) {
                            if (cards[k].id == ids[j]) {
                                var clone = Object.assign({}, cards[k])
                                clone.params = {
                                    emit: {
                                        onEnter: (function (c) {
                                            return function () {
                                                Lampa.Activity.push({
                                                    url: '',
                                                    title: c.title || c.name,
                                                    component: 'full',
                                                    card: c,
                                                    page: 1
                                                })
                                            }
                                        })(clone),
                                        onFocus: (function (c) {
                                            return function () {
                                                Lampa.Background.change(Lampa.Utils.cardImgBackground(c))
                                            }
                                        })(clone)
                                    }
                                }
                                results.push(clone)
                                break
                            }
                        }
                    }

                    if (results.length === 0) continue

                    lines.push({
                        title: cat.title,
                        results: results,
                        total_pages: 1,
                        page: 1,
                        params: {
                            module: Lampa.Maker.module('Line').toggle(
                                Lampa.Maker.module('Line').MASK.base,
                                'Event'
                            )
                        }
                    })
                }

                return lines
            }
        })
    } catch (e) {
        console.error('Scrob', 'registerBookmarksRows error', e)
    }
}

// ─── Direct-storage toggle for custom categories ───
// Core Favorite.toggle() routes through cloud()/check() which only knows
// the hardcoded category whitelist, so custom keys never register as present.
// This helper manages storage directly and emits the same UI event.

function toggleCustomCategory(key, card) {
    var favorite = Lampa.Storage.get('favorite', '{}')
    if (typeof favorite === 'string') {
        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
    }

    var ids = Array.isArray(favorite[key]) ? favorite[key] : []
    var idx = ids.indexOf(card.id)
    var method

    if (idx === -1) {
        // Add: insert id at top and ensure card exists in the shared pool
        ids.unshift(card.id)
        favorite[key] = ids

        var pool = Array.isArray(favorite.card) ? favorite.card : []
        var exists = false
        for (var i = 0; i < pool.length; i++) {
            if (pool[i].id == card.id) { exists = true; break }
        }
        if (!exists && Lampa.Utils.clearCard && Lampa.Arrays.clone) {
            pool.unshift(Lampa.Utils.clearCard(Lampa.Arrays.clone(card)))
            favorite.card = pool
        }

        method = 'add'
    } else {
        // Remove: splice the id out. KEEP the card in favorite.card —
        // core Favorite.remove() prunes the pool via the whitelist-only check()
        // and would destroy cards that live only in custom categories.
        ids.splice(idx, 1)
        favorite[key] = ids

        method = 'remove'
    }

    Lampa.Storage.set('favorite', favorite)

    // Notify the UI layer (same event shape the core emits)
    Lampa.Listener.send('state:changed', {
        target: 'favorite',
        reason: 'update',
        method: method,
        type: key,
        card: card
    })
}

// ─── Card menu patch for custom categories (v3 Card Module) ───
// Wraps CardModule.Menu.onCreate to inject custom favorite categories
// into the long-press card action bar (same pattern as kinobaza/custom-favs.js).

function patchCardMenu() {
    try {
        var cardModule = Lampa.Maker.map('Card')
        if (!cardModule || !cardModule.Menu || !cardModule.Menu.onCreate) return

        var categories = custom.getAll()
        if (!categories || !categories.length) return

        var onMenuCreate = cardModule.Menu.onCreate
        cardModule.Menu.onCreate = function () {
            var self = this

            // Find the Favorites entry in menu_list by title
            var favoriteMenuList = this.menu_list.filter(function (menu) {
                return menu.title === Lampa.Lang.translate('settings_input_links')
            })[0]

            if (!favoriteMenuList) {
                onMenuCreate.apply(this, arguments)
                return
            }

            var originalMenu = favoriteMenuList.menu

            favoriteMenuList.menu = function () {
                // Build custom category checkbox items
                var newItems = categories.map(function (cat) {
                    var favorite = Lampa.Storage.get('favorite', '{}')
                    if (typeof favorite === 'string') {
                        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
                    }

                    var ids = Array.isArray(favorite[cat.key]) ? favorite[cat.key] : []
                    var isChecked = ids.indexOf(self.data.id) !== -1

                    return {
                        checkbox: true,
                        checked: isChecked ? self.data.id : undefined,
                        title: cat.title,
                        onCheck: function (item, elem) {
                            toggleCustomCategory(cat.key, self.data)

                            // Recompute checked state after toggle
                            var fresh = Lampa.Storage.get('favorite', '{}')
                            if (typeof fresh === 'string') {
                                try { fresh = JSON.parse(fresh) } catch (e) { fresh = {} }
                            }

                            var member = Array.isArray(fresh[cat.key]) && fresh[cat.key].indexOf(self.data.id) !== -1
                            elem.toggleClass('selectbox-item--checked', member)
                        }
                    }
                })

                var oldMenuItems = originalMenu.apply(favoriteMenuList)

                if (newItems.length) {
                    var scrobSeparator = {
                        title: Lampa.Lang.translate('scrob_title'),
                        separator: true
                    }
                    // Find the Status separator to insert Scrob section before it
                    var statusIdx = -1
                    for (var s = 0; s < oldMenuItems.length; s++) {
                        if (oldMenuItems[s] && oldMenuItems[s].separator &&
                            oldMenuItems[s].title === Lampa.Lang.translate('settings_cub_status')) {
                            statusIdx = s
                            break
                        }
                    }
                    if (statusIdx > -1) {
                        var before = oldMenuItems.slice(0, statusIdx)
                        var after = oldMenuItems.slice(statusIdx)
                        return before.concat(scrobSeparator, newItems, after)
                    }
                    return oldMenuItems.concat(scrobSeparator, newItems)
                }

                return oldMenuItems
            }

            onMenuCreate.apply(this, arguments)
        }
    } catch (e) {
        console.error('Scrob', 'patchCardMenu error', e)
    }
}

// ─── Full card bookmark button patch for custom categories ──
// Intercepts the .button--book click on the full card detail page
// and injects custom category items into the Select popup.
// This covers path #2 (separate from CardModule.Menu used by line cards).

function patchFullCardBookmark() {
    try {
        var customAttached = false

        function attachToButton() {
            if (customAttached) return

            var btn = document.querySelector('.button--book')
            if (!btn) return

            var act = Lampa.Activity.active()
            if (!act || act.component !== 'full' || !act.card) return

            customAttached = true
            var cardData = act.card
            if (!cardData || !cardData.id) return

            $(btn).on('hover:enter.scrob_bookmark', function () {
                setTimeout(function () {
                    var $box = $('body > .selectbox')
                    if (!$box.length) return

                    var categories = custom.getAll()
                    if (!categories || !categories.length) return
                    if ($box.find('.scrob-select-item').length) return

                    var favorite = Lampa.Storage.get('favorite', '{}')
                    if (typeof favorite === 'string') {
                        try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
                    }

                    // Find Status separator — could be .settings-param-title or .selectbox-item with that text
                    var $insertBefore = $box.find('.settings-param-title').filter(function () {
                        return $(this).find('span').text() === Lampa.Lang.translate('settings_cub_status')
                    }).first()

                    if (!$insertBefore.length) {
                        $insertBefore = $box.find('.selectbox-item__title').filter(function () {
                            return $(this).text() === Lampa.Lang.translate('settings_cub_status')
                        }).first().closest('.selectbox-item')
                    }

                    // Build Scrob separator
                    if (categories.length) {
                        var $separator = $('<div class="settings-param-title"><span>' + Lampa.Lang.translate('scrob_title') + '</span></div>')
                        if ($insertBefore.length) $separator.insertBefore($insertBefore)
                        else $separator.appendTo($box.find('.scroll__body'))
                    }

                    for (var i = 0; i < categories.length; i++) {
                        var cat = categories[i]
                        var $item = $(
                            '<div class="selectbox-item selector scrob-select-item">' +
                                '<div class="selectbox-item__title"></div>' +
                                '<div class="selectbox-item__checkbox"></div>' +
                            '</div>'
                        )
                        $item.find('.selectbox-item__title').text(cat.title)

                        var ids = favorite[cat.key]
                        if (Array.isArray(ids) && ids.indexOf(cardData.id) !== -1) {
                            $item.addClass('selectbox-item--checked')
                        }

                        if ($insertBefore.length) $item.insertBefore($insertBefore)
                        else $item.appendTo($box.find('.scroll__body'))

                        $item.on('hover:enter', (function (catKey) {
                            return function () {
                                toggleCustomCategory(catKey, cardData)
                                var fresh = Lampa.Storage.get('favorite', '{}')
                                if (typeof fresh === 'string') {
                                    try { fresh = JSON.parse(fresh) } catch (e) { fresh = {} }
                                }
                                var member = Array.isArray(fresh[catKey]) && fresh[catKey].indexOf(cardData.id) !== -1
                                $(this).toggleClass('selectbox-item--checked', member)
                            }
                        })(cat.key))
                    }

                    Lampa.Controller.collectionSet($box.find('.scroll__body'))
                    setTimeout(function () {
                        var $items = $box.find('.selector')
                        if ($items.length) {
                            Lampa.Controller.focus($items.get(0))
                            Navigator.focus($items.get(0))
                        }
                    }, 10)
                }, 200)
            })
        }

        Lampa.Listener.follow('activity', function () {
            customAttached = false
            attachToButton()
            setTimeout(attachToButton, 300)
            setTimeout(attachToButton, 600)
        })
    } catch (e) {
        console.error('Scrob', 'patchFullCardBookmark error', e)
    }
}

// ─── Settings section ─────────────────────────────────────

function initSettings() {
    Lampa.SettingsApi.addComponent({
        component: 'scrob',
        icon: ICON_SVG,
        name: Lampa.Lang.translate('scrob_title'),
        before: 'interface'
    })

    // Server address
    Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: { name: KEYS.SERVER_URL, type: 'input', default: '', values: '', placeholder: 'https://scrob.example.com' },
        field: { name: Lampa.Lang.translate('scrob_server_url') }
    })

    // Sign-in trigger — one row opening a choice of three standalone methods
    // (API key / login+password / QR code), matching the standalone Scrob
    // Lampa plugin's own menu instead of always-visible input fields.
    Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: { name: 'scrob_auth_trigger_btn', type: 'button' },
        field: { name: Lampa.Lang.translate('scrob_auth_trigger') },
        onChange: function () { showAuthChoice('settings_component') }
    })

    // Current user static line — shown once any of the three methods is
    // signed in (see scrob_auth_trigger_btn above, hidden by then).
    Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: { name: 'scrob_user_info', type: 'static' },
        field: { name: '' },
        onRender: function (item) {
            item.attr('data-name', 'scrob_user_info')

            var me = getMe()
            var text = ''

            if (me.username) {
                text = me.username + (me.email ? ' (' + me.email + ')' : '')
            } else if (Lampa.Storage.get(KEYS.DEVICE_ACCESS_TOKEN, '')) {
                text = Lampa.Lang.translate('scrob_auth_status_qr')
            } else if (Lampa.Storage.get(KEYS.OWN_API_KEY, '')) {
                text = Lampa.Lang.translate('scrob_auth_status_apikey')
            }

            item.find('.settings-param__name').text(text)
        }
    })

    // Logout button
    Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: { name: 'scrob_logout_btn', type: 'button' },
        field: { name: Lampa.Lang.translate('scrob_logout') },
        onChange: doLogout
    })

    // ── Sync nested page button (after logout block) ─────
    Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: { name: 'scrob_open_sync', type: 'button' },
        field: { name: Lampa.Lang.translate('scrob_sync_title') },
        onChange: function () {
            Lampa.Settings.create('scrob_sync_page', {
                onBack: function () { Lampa.Settings.create('scrob') }
            })
        }
    })

    // ══════════════════════════════════════════════════════
    //  NESTED PAGE: Sync settings
    // ══════════════════════════════════════════════════════

    // Toggle sync on/off
    Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: { name: KEYS.SYNC_ENABLED, type: 'trigger', default: false },
        field: { name: Lampa.Lang.translate('scrob_sync_enabled') },
        onChange: function (value) {
            Lampa.Storage.set(KEYS.SYNC_ENABLED, value)

            if (value) {
                // Check for blocking conflicts before starting
                var conflicts = sync.detectConflicts()
                var blocked = false
                for (var i = 0; i < conflicts.length; i++) {
                    if (conflicts[i].type === 'cub_sync') {
                        Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_blocked_cub'))
                        Lampa.Storage.set(KEYS.SYNC_ENABLED, false)
                        blocked = true
                        break
                    }
                }

                if (!blocked) {
                    sync.start()
                    Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_started'))
                }
            } else {
                sync.stop()
                Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_stopped'))
            }
        }
    })

    // Poll interval select
    Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
            name: KEYS.SYNC_INTERVAL,
            type: 'select',
            values: {
                15: '15',
                30: '30',
                60: '60',
                120: '120'
            },
            default: '30'
        },
        field: {
            name: Lampa.Lang.translate('scrob_sync_interval'),
            description: Lampa.Lang.translate('scrob_sync_interval_descr')
        },
        onChange: function (value) {
            Lampa.Storage.set(KEYS.SYNC_INTERVAL, value)
        }
    })

    // Manual sync button
    Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: { name: 'scrob_sync_force_btn', type: 'button' },
        field: { name: Lampa.Lang.translate('scrob_sync_now') },
        onChange: function () {
            if (!Lampa.Storage.get(KEYS.SYNC_ENABLED)) {
                Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_stopped'))
                return
            }

            sync.forceSync()
            Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_now') + '…')
        }
    })

    // ── List mapping button ─────────────────────────────
    Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: { name: 'scrob_map_btn', type: 'button' },
        field: { name: Lampa.Lang.translate('scrob_map_title') },
        onChange: showMappingFlow
    })

    // Active mappings button (shown/hidden via settingsListener)
    Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: { name: 'scrob_map_active_btn', type: 'button' },
        field: { name: Lampa.Lang.translate('scrob_map_active') },
        onChange: showActiveMappings
    })

    // Status line (static, updated on render)
    Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: { name: 'scrob_sync_status', type: 'static' },
        field: { name: '' },
        onRender: function (item) {
            item.attr('data-name', 'scrob_sync_status')

            var status = sync.getStatus()
            var nameEl = item.find('.settings-param__name')

            if (!status.running) {
                nameEl.text(Lampa.Lang.translate('scrob_sync_stopped'))
                return
            }

            // Format last sync time
            var timeText = '—'
            if (status.lastSync) {
                var d = new Date(status.lastSync)
                var hh = ('0' + d.getHours()).slice(-2)
                var mm = ('0' + d.getMinutes()).slice(-2)
                timeText = hh + ':' + mm
            }

            var text = Lampa.Lang.translate('scrob_sync_status_last') + ': ' + timeText +
                ' • ' + status.listCount + ' ' + Lampa.Lang.translate('scrob_sync_title').toLowerCase() +
                ' / ' + status.itemCount

            // Append conflict warnings
            if (status.conflicts && status.conflicts.length > 0) {
                for (var i = 0; i < status.conflicts.length; i++) {
                    var c = status.conflicts[i]
                    if (c.type === 'cub_sync') {
                        text += '\n' + Lampa.Lang.translate('scrob_sync_blocked_cub')
                    } else if (c.type === 'gramsync') {
                        text += '\n' + Lampa.Lang.translate('scrob_sync_conflict_gramsync')
                    }
                }
            }

            // Append broken mapping warnings
            if (status.brokenMappings && status.brokenMappings.length > 0) {
                for (var b = 0; b < status.brokenMappings.length; b++) {
                    text += '\n' + Lampa.Lang.translate('scrob_map_broken').replace('%s', status.brokenMappings[b])
                }
            }

            nameEl.text(text)
        }
    })

    // Show/hide rows depending on authorization state (pattern: kinobaza settings.js)
    settingsListener = function (e) {
        if (e.name === 'scrob') {
            var body = e.body.find('.scroll__body > div')

            if (hasSession()) {
                body.find('[data-name="scrob_auth_trigger_btn"]').remove()
            } else {
                body.find('[data-name="scrob_user_info"]').remove()
                body.find('[data-name="scrob_logout_btn"]').remove()
                body.find('[data-name="scrob_open_sync"]').remove()
            }
        }

        // Hide sync controls if no session
        if (e.name === 'scrob_sync_page' && !hasSession()) {
            e.body.find('.scroll__body > div').html('')
            return
        }

        // Show/hide active mappings button based on whether mappings exist
        if (e.name === 'scrob_sync_page') {
            var map = sync.getMap()
            var hasMappings = Object.keys(map).length > 0
            var body2 = e.body.find('.scroll__body > div')
            if (!hasMappings) {
                body2.find('[data-name="scrob_map_active_btn"]').addClass('hide')
            } else {
                body2.find('[data-name="scrob_map_active_btn"]').removeClass('hide')
            }
        }
    }

    Lampa.Settings.listener.follow('open', settingsListener)
}

// ─── Lifecycle ────────────────────────────────────────────

// Fetch socket config from admin settings and initialize WebSocket.
// Only activates for 'external' or 'internal' modes; otherwise polling remains.
function initSocket() {
    console.log('Scrob', 'initSocket called')
    var username = Lampa.Storage.get(KEYS.USERNAME)
    var password = Lampa.Storage.get(KEYS.PASSWORD)
    console.log('Scrob', 'credentials:', username ? 'yes' : 'no', password ? 'yes' : 'no')

    // Always re-login first to get a fresh token
    if (!username || !password) {
        console.warn('Scrob', 'no credentials for login — using polling')
        return
    }

    api.login(username, password, function (token) {
        if (!token || !token.access_token) {
            console.warn('Scrob', 'login failed — using polling')
            return
        }

        // Save fresh token
        Lampa.Storage.set(KEYS.ACCESS_TOKEN, token.access_token)
        console.log('Scrob', 'login successful, token saved')

        // Now fetch admin settings with fresh token
        api.adminSettings(function (settings) {
            console.log('Scrob', 'adminSettings received:', JSON.stringify(settings))
            startSocket(settings)
        }, function (err) {
            console.warn('Scrob', 'adminSettings failed:', err, '- using polling')
        })
    }, function (err) {
        console.warn('Scrob', 'login request failed:', err, '- using polling')
    })

    function startSocket(settings) {
        if (settings.socket_mode === 'external' || settings.socket_mode === 'internal') {
            var me = getMe()
            var config = {
                mode: settings.socket_mode,
                namespace: settings.socket_namespace,
                externalUrl: settings.socket_external_url,
                host: serverUrl(),
                port: settings.socket_internal_port || 7332,
                joinKey: settings.socket_join_key,
                sendKey: settings.socket_send_key,
                username: me ? me.username : ''
            }

            if (scrobSocketInit(config)) {
                sync.useSocket(getScrobSocket())
                console.log('Scrob', 'socket initialized, mode:', settings.socket_mode)
            }
        } else {
            console.log('Scrob', 'socket disabled, using polling')
        }
    }
}

// Re-render header button from saved session on startup
function restoreSession() {
    if (hasSession()) {
        renderHeaderButton()

        // Start sync if enabled (lifecycle wiring)
        if (Lampa.Storage.get(KEYS.SYNC_ENABLED)) sync.start()
    }
}

function startPlugin() {
    console.log('Scrob', 'startPlugin called')
    window.scrob_plugin = true

    Lampa.Manifest.plugins = {
        type: 'other',
        version: '1.0.0',
        name: 'Scrob',
        description: 'Scrob server profiles and watch data isolation',
        component: 'scrob'
    }

    addLang()

    Lampa.Template.add('scrob_style', '<style>@@include("./css/style.scss")</style>')
    $('body').append(Lampa.Template.get('scrob_style', {}, true))

    // Nested page template for sync settings
    Lampa.Template.add('settings_scrob_sync_page', '<div></div>')

    // Register custom category viewer component
    Lampa.Component.add('scrob_category', CategoryComponent)

    initSettings()

    // Register bookmarks rows once — displays custom categories on bookmarks screen
    registerBookmarksRows()

    // Inject custom categories into card long-press menu
    patchCardMenu()

    // Inject custom categories into full card bookmark button
    patchFullCardBookmark()

    if (window.appready) {
        restoreSession()
        refreshCustomMenu()
        initSocket()
        ensureDeviceTokenFresh()
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                restoreSession()
                refreshCustomMenu()
                initSocket()
                ensureDeviceTokenFresh()
            }
        })
    }

    // Keep the QR-paired device token from expiring under a long-running app —
    // checked well before actual expiry (see DEVICE_TOKEN_REFRESH_BUFFER_MS).
    setInterval(ensureDeviceTokenFresh, 2 * 60 * 1000)

    // Clean up socket on app destroy
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'destroy') scrobSocketDisconnect()
    })
}

if (!window.scrob_plugin) startPlugin()
