// Storage keys and session helpers for the Scrob plugin.
// All keys are prefixed with scrob_ so they never collide with CUB account/account_user.

export var KEYS = {
    SERVER_URL: 'scrob_server_url',
    USERNAME: 'scrob_username',
    PASSWORD: 'scrob_password',
    OWN_API_KEY: 'scrob_own_api_key',
    ACCESS_TOKEN: 'scrob_access_token',
    ME: 'scrob_me',
    PROFILES: 'scrob_profiles',
    ACTIVE_PROFILE_ID: 'scrob_active_profile_id',
    ACTIVE_API_KEY: 'scrob_active_api_key',
    SYNC_ENABLED: 'scrob_sync_enabled',
    SYNC_INTERVAL: 'scrob_sync_interval'
}

// Keys isolated per profile: backed up on switch, restored for the target.
export var ISOLATED_KEYS = [
    'favorite',
    'online_view',
    'online_watched_last',
    'online_last_balanser',
    'file_view',
    'torrents_view',
    'torrents_filter_data'
]

// Defaults applied when the target profile has no saved data yet.
var DEFAULTS = {
    favorite: '{}',
    online_view: '{}',
    online_watched_last: '{}',
    online_last_balanser: '{}',
    file_view: '{}',
    torrents_view: '{}',
    torrents_filter_data: '[]'
}

// Backup storage key for one isolated key of one profile.
export function backupKey(userId, key) {
    return 'scrob_backup_' + userId + '_' + key
}

// Default value for an isolated key.
export function defaultValue(key) {
    return DEFAULTS[key] || '{}'
}

// Server URL without trailing slash, '' when not set.
export function serverUrl() {
    var url = (Lampa.Storage.get(KEYS.SERVER_URL) || '').trim()
    if (url.slice(-1) === '/') url = url.slice(0, -1)
    return url
}

export function getMe() {
    var val = Lampa.Storage.get(KEYS.ME, {})
    return typeof val === 'object' && val !== null ? val : {}
}

export function getProfiles() {
    var val = Lampa.Storage.get(KEYS.PROFILES, [])
    return Array.isArray(val) ? val : []
}

// Active profile object from cached list, falls back to logged-in user.
export function activeProfile() {
    var id = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID)
    var list = getProfiles()

    for (var i = 0; i < list.length; i++) {
        if (list[i].id == id) return list[i]
    }

    return getMe()
}

export function hasSession() {
    return !!(Lampa.Storage.get(KEYS.ACCESS_TOKEN) && getMe().id)
}

// Clear session keys on logout. Credentials (server/username/password) are kept for re-login.
export function clearSession() {
    ;[
        KEYS.OWN_API_KEY,
        KEYS.ACCESS_TOKEN,
        KEYS.ME,
        KEYS.PROFILES,
        KEYS.ACTIVE_PROFILE_ID,
        KEYS.ACTIVE_API_KEY
    ].forEach(function (key) {
        Lampa.Storage.set(key, '')
    })
}
