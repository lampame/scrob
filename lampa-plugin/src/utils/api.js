// Scrob server API wrapper. All requests go through new Lampa.Reguest().
// Base prefix of every endpoint: {server_url}/api/proxy
import { serverUrl, KEYS } from './storage'

function base() {
    return serverUrl() + '/api/proxy'
}

// X-Api-Key header from the user's settings key. ALWAYS present, even empty —
// the Astro session-cookie gate (middleware.ts) only checks that this header
// exists at all (its value is validated separately, by the backend) before
// letting a /api/proxy/* request through without redirecting to /login. A
// non-browser client like this plugin never has that cookie, so omitting the
// header entirely (as before) silently blocked every request made with no
// api_key configured yet — including the login/QR-pairing requests themselves.
function apiKeyHeaders() {
    var key = Lampa.Storage.get(KEYS.OWN_API_KEY) || ''
    return { 'X-Api-Key': key }
}

// Bearer token header from the user's session; empty object when not set
function bearerHeaders() {
    var token = Lampa.Storage.get(KEYS.ACCESS_TOKEN) || ''
    return token ? { Authorization: 'Bearer ' + token } : {}
}

// Headers for regular (non-bootstrap) requests: the manually-entered API key
// when present, otherwise the QR-paired device token as Bearer. Either alone
// satisfies the backend's own per-endpoint auth dependency; X-Api-Key is
// always sent (see apiKeyHeaders() above) so the Astro gate lets the request
// through either way.
function authHeaders() {
    var headers = apiKeyHeaders()
    var apiKey = Lampa.Storage.get(KEYS.OWN_API_KEY) || ''
    if (!apiKey) {
        var deviceToken = Lampa.Storage.get(KEYS.DEVICE_ACCESS_TOKEN) || ''
        if (deviceToken) headers['Authorization'] = 'Bearer ' + deviceToken
    }
    return headers
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
        { headers: authHeaders() }
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
        { headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()) }
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
        { headers: authHeaders() }
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
        { headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()) }
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
        { headers: authHeaders(), type: 'DELETE' }
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
        { headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()) }
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
        { headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()) }
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
        { headers: authHeaders(), type: 'DELETE' }
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
        { headers: authHeaders() }
    )
}

// ─── QR device pairing (OAuth 2.0 Device Authorization Grant, /auth/device/*) ───
// These three requests are genuinely anonymous by design (RFC 8628) — the Astro
// gate explicitly exempts them (middleware.ts PUBLIC_PREFIXES), no X-Api-Key/
// Bearer needed at all. Uses raw fetch() instead of Lampa.Reguest(): the poll's
// "still pending" response is itself a non-2xx status carrying a JSON body
// ({error: "authorization_pending" | "slow_down" | ...}) the caller needs to
// read, which Reguest's onFail callback isn't set up to expose here.

// POST /auth/device/code — start pairing; returns device_code/user_code/verification_uri(_complete)
export function deviceCode(onDone, onFail) {
    fetch(base() + '/auth/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: 'Lampa', scope: 'write' })
    })
        .then(function (r) { return r.ok ? r.json() : null })
        .then(function (data) {
            if (data && data.device_code && data.user_code) onDone(data)
            else onFail()
        })
        .catch(function () { onFail() })
}

// POST /auth/device/token (grant_type=device_code) — one poll of the pairing loop.
// onDone always receives { ok, body }: the caller reads body.error to tell
// authorization_pending/slow_down (keep polling) apart from a real outcome.
export function deviceToken(deviceCodeValue, onDone, onFail) {
    fetch(base() + '/auth/device/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=' + encodeURIComponent(deviceCodeValue)
    })
        .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body || {} } }) })
        .then(onDone)
        .catch(function () { onFail() })
}

// POST /auth/device/token (grant_type=refresh_token) — rotates refresh_token on every call.
export function deviceTokenRefresh(refreshToken, onDone, onFail) {
    fetch(base() + '/auth/device/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken)
    })
        .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body || {} } }) })
        .then(onDone)
        .catch(function () { onFail() })
}
