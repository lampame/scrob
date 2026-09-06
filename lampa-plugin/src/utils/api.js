// Scrob server API wrapper. All requests go through new Lampa.Reguest().
// Base prefix of every endpoint: {server_url}/api/proxy
import { serverUrl, KEYS } from './storage'

function base() {
    return serverUrl() + '/api/proxy'
}

// X-Api-Key header for the currently active identity: the switched-to
// profile's own key when an admin has picked one (switchProfile()/
// completeLogin() write ACTIVE_API_KEY), otherwise the signed-in user's own
// key. Without this, every request kept using OWN_API_KEY regardless of
// which profile was selected - ACTIVE_API_KEY was written on every switch
// but never read anywhere, so admin profile-switching never actually
// changed whose account requests were made under.
function apiKeyHeaders() {
    var key = Lampa.Storage.get(KEYS.ACTIVE_API_KEY) || Lampa.Storage.get(KEYS.OWN_API_KEY) || ''
    return key ? { 'X-Api-Key': key } : {}
}

// Bearer token header from the user's session; empty object when not set
function bearerHeaders() {
    var token = Lampa.Storage.get(KEYS.ACCESS_TOKEN) || ''
    return token ? { Authorization: 'Bearer ' + token } : {}
}

function parse(data) {
    if (typeof data !== 'string') return data

    try {
        return JSON.parse(data)
    } catch (e) {
        return null
    }
}

// POST /auth/login — form-urlencoded username+password → Token
// NOTE: login is an unauthenticated endpoint — do NOT send Bearer
// NOTE: Astro middleware requires X-Api-Key for /api/proxy/* routes
// OAuth2 Password Flow requires grant_type=password
export function login(username, password, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    var body = 'grant_type=password&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password)

    network.native(
        base() + '/auth/login',
        function (data) {
            network.clear()

            var json = parse(data)

            if (json) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        body,
        { headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, apiKeyHeaders()) }
    )
}

// GET /auth/me — Bearer token → User
export function me(token, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/auth/me',
        function (data) {
            network.clear()

            var json = parse(data)

            if (json && json.id) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: Object.assign({ Authorization: 'Bearer ' + token }, apiKeyHeaders()) }
    )
}

// GET /admin/users — Bearer token, admin only → AdminUser[]
export function adminUsers(token, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/admin/users',
        function (data) {
            network.clear()

            var json = parse(data)

            if (Array.isArray(json)) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: Object.assign({ Authorization: 'Bearer ' + token }, apiKeyHeaders()) }
    )
}

// ─── List sync API methods ────────────────────────────────

// GET /lists — all user lists (without items)
export function getLists(onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/lists',
        function (data) {
            network.clear()

            var json = parse(data)

            // Server wraps the array: { lists: [...] } — accept both shapes
            if (Array.isArray(json)) onDone(json)
            else if (json && Array.isArray(json.lists)) onDone(json.lists)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: apiKeyHeaders() }
    )
}

// POST /lists — create a new list
export function createList(name, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/lists',
        function (data) {
            network.clear()

            var json = parse(data)

            if (json && json.id) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        JSON.stringify({ name: name, privacy_level: 'private' }),
        { headers: Object.assign({ 'Content-Type': 'application/json' }, apiKeyHeaders()) }
    )
}

// GET /lists/{listId} — list detail, items in .items field
export function getListItems(listId, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/lists/' + listId,
        function (data) {
            network.clear()

            var json = parse(data)

            // List detail returns { ..., items: [...] } — unwrap
            if (json && Array.isArray(json.items)) onDone(json.items)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: apiKeyHeaders() }
    )
}

// POST /lists/{listId}/items — add an item to a list
export function addListItem(listId, tmdbId, mediaType, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/lists/' + listId + '/items',
        function (data) {
            network.clear()

            var json = parse(data)

            if (json) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            // Pass HTTP status to onFail so callers can handle 409 (already exists)
            var status = a && a.status
            onFail(network.errorDecode(a, c), status)
        },
        JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType }),
        { headers: Object.assign({ 'Content-Type': 'application/json' }, apiKeyHeaders()) }
    )
}

// DELETE /lists/{listId}/items/{itemId} — remove an item from a list
export function deleteListItem(listId, itemId, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/lists/' + listId + '/items/' + itemId,
        function () {
            network.clear()
            onDone()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: apiKeyHeaders(), type: 'DELETE' }
    )
}

// POST /socket/events — socket-plane ingest, same services as REST
// Body: { type, payload }. Auth via X-Api-Key header.
export function socketIngest(type, payload, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/socket/events',
        function (data) {
            network.clear()

            var json = parse(data)

            if (json) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            // Pass HTTP status to onFail so callers can handle 409 (already exists)
            var status = a && a.status
            onFail(network.errorDecode(a, c), status)
        },
        JSON.stringify({ type: type, payload: payload || {} }),
        { headers: Object.assign({ 'Content-Type': 'application/json' }, apiKeyHeaders()) }
    )
}

// ─── Admin & history API methods ──────────────────────────

// GET /admin/settings — socket configuration for the server
// NOTE: Astro middleware requires X-Api-Key for /api/proxy/* routes
// NOTE: backend requires Bearer token (OAuth2PasswordBearer)
export function adminSettings(onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(10000)

    network.native(
        base() + '/admin/settings',
        function (data) {
            network.clear()
            var json = parse(data)
            if (json) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: Object.assign({}, apiKeyHeaders(), bearerHeaders()) }
    )
}

// POST /history — mark a media as watched
export function addHistoryEvent(tmdbId, mediaType, completed, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/history',
        function (data) {
            network.clear()
            var json = parse(data)
            if (json) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        JSON.stringify({
            tmdb_id: tmdbId,
            media_type: mediaType,
            completed: completed
        }),
        { headers: Object.assign({ 'Content-Type': 'application/json' }, apiKeyHeaders()) }
    )
}

// DELETE /history/{eventId} — remove a watch event
export function removeHistoryEvent(eventId, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    network.native(
        base() + '/history/' + eventId,
        function () {
            network.clear()
            onDone()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: apiKeyHeaders(), type: 'DELETE' }
    )
}

// GET /history — fetch watch history with optional pagination and type filter
export function getHistory(page, pageSize, mediaType, onDone, onFail) {
    var network = new Lampa.Reguest()
    network.timeout(15000)

    var params = []
    if (page) params.push('page=' + page)
    if (pageSize) params.push('page_size=' + pageSize)
    if (mediaType) params.push('type=' + mediaType)

    var queryString = params.length ? '?' + params.join('&') : ''

    network.native(
        base() + '/history' + queryString,
        function (data) {
            network.clear()
            var json = parse(data)
            if (json) onDone(json)
            else onFail()
        },
        function (a, c) {
            network.clear()
            onFail(network.errorDecode(a, c))
        },
        false,
        { headers: apiKeyHeaders() }
    )
}
