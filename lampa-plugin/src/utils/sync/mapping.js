// Scrob sync — category mapping between Lampa favorite keys and Scrob list names.
// Canonical list names are static English, never translated.
// Universal rule: any other array key → '[Lampa] ' + Capitalized(key).
// Excluded from iteration: card, history, viewed.

// Canonical mapping: Lampa key → Scrob list name
var CANONICAL = {
    book:      '[Lampa] Bookmarks',
    like:      '[Lampa] Like',
    wath:      '[Lampa] Later',
    scheduled: '[Lampa] Scheduled',
    continued: '[Lampa] To be continued',
    thrown:    '[Lampa] Thrown',
    look:      '[Lampa] Look'
}

// Keys excluded from sync iteration
var EXCLUDED = { card: true, history: true, viewed: true }

// Mark categories — mutually exclusive statuses (section 13, point 3)
var MARK_KEYS = ['scheduled', 'continued', 'thrown', 'look', 'viewed']

// Capitalize first letter of a string
function capitalize(str) {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// Get Scrob list name for a Lampa favorite key.
// Canonical keys get static names; unknown keys use universal rule.
// Returns null for excluded keys (card, history, viewed).
export function listNameForKey(key) {
    if (EXCLUDED[key]) return null
    if (CANONICAL[key]) return CANONICAL[key]
    return '[Lampa] ' + capitalize(key)
}

// Get all syncable keys from a favorite object (all array keys except excluded).
export function syncableKeys(favorite) {
    var keys = []
    for (var k in favorite) {
        if (!EXCLUDED[k] && Array.isArray(favorite[k])) {
            keys.push(k)
        }
    }
    return keys
}

// Detect entity type from a Lampa card object.
// Returns: 'person' | 'series' | 'movie'
export function detectMediaType(card) {
    if (!card) return 'movie'

    // Person detection (from custom/core/favorite.js:98)
    if (card.profile_path || card.known_for_department || typeof card.gender !== 'undefined') {
        return 'person'
    }

    // Series detection
    if (card.method === 'tv' || card.first_air_date || (card.name && !card.title)) {
        return 'series'
    }

    return 'movie'
}

// Convert Lampa method/type to Scrob media_type.
// Lampa uses 'tv', Scrob uses 'series'.
export function toScrobType(lampaType) {
    if (lampaType === 'tv') return 'series'
    return lampaType // 'movie', 'person'
}

// Convert Scrob media_type to Lampa method.
// Scrob uses 'series', Lampa uses 'tv'.
export function toLampaMethod(scrobType) {
    if (scrobType === 'series') return 'tv'
    if (scrobType === 'person') return undefined
    return 'movie'
}

// Build element key for mirror: "media_type:tmdb_id"
export function elementKey(mediaType, tmdbId) {
    return mediaType + ':' + tmdbId
}

// Parse element key back to components
export function parseElementKey(key) {
    var idx = key.indexOf(':')
    if (idx === -1) return { mediaType: 'movie', tmdbId: key }
    return {
        mediaType: key.substring(0, idx),
        tmdbId: key.substring(idx + 1)
    }
}

// Build a minimal Lampa card from Scrob media object (section 7).
// Enough for Lampa to open full-screen and fetch details.
export function cardFromScrobMedia(media) {
    if (!media || !media.tmdb_id) return null

    var method = toLampaMethod(media.type)
    var card = {
        id: media.tmdb_id,
        method: method,
        title: media.title || '',
        poster_path: media.poster_path || '',
        backdrop_path: media.backdrop_path || '',
        release_date: media.release_date || ''
    }

    // Series: duplicate title into name/original_name for Lampa compatibility
    if (media.type === 'series') {
        card.name = media.title || ''
        card.original_name = media.title || ''
    }

    return card
}

// Map of excluded keys for external checks
export { EXCLUDED, MARK_KEYS, CANONICAL }
