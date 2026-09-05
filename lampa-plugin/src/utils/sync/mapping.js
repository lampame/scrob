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

// ─── Unified KeyResolver (single implementation for REST + socket paths) ───
// map: mapstore mapping object { lampaKey: { list_id, list_name } }
// mirrorLists: mirror.get().lists ({ name: { list_id } })
// favorite: parsed favorite object (for custom keys discovered at runtime)

// Resolve the Lampa key for a Scrob list name.
// Priority: 1) mapstore reverse lookup by name, 2) canonical names, 3) custom keys.
export function resolveKeyForListName(listName, map, favorite) {
    if (!listName) return null
    if (map) {
        var mapKeys = Object.keys(map)
        for (var i = 0; i < mapKeys.length; i++) {
            if (map[mapKeys[i]].list_name === listName) return mapKeys[i]
        }
    }
    var canonicals = ['book', 'like', 'wath', 'scheduled', 'continued', 'thrown', 'look']
    for (var j = 0; j < canonicals.length; j++) {
        if (CANONICAL[canonicals[j]] === listName) return canonicals[j]
    }
    if (favorite) {
        var keys = syncableKeys(favorite)
        for (var k = 0; k < keys.length; k++) {
            if (listNameForKey(keys[k]) === listName) return keys[k]
        }
    }
    return null
}

// Resolve the Scrob list name for a list_id via the mirror index.
export function resolveNameForListId(listId, mirrorLists) {
    if (listId == null || !mirrorLists) return null
    var names = Object.keys(mirrorLists)
    for (var i = 0; i < names.length; i++) {
        if (mirrorLists[names[i]].list_id == listId) return names[i]
    }
    return null
}

// Resolve the Lampa key for a Scrob list_id.
// Priority: 1) mapstore reverse lookup by id, 2) mirror name → key.
export function resolveKeyForListId(listId, map, mirrorLists, favorite) {
    if (listId == null) return null
    if (map) {
        var keys = Object.keys(map)
        for (var i = 0; i < keys.length; i++) {
            if (map[keys[i]].list_id == listId) return keys[i]
        }
    }
    var name = resolveNameForListId(listId, mirrorLists)
    if (name) return resolveKeyForListName(name, map, favorite)
    return null
}

// ─── Unified applicator (single write path with core marks logic) ───
// All functions mutate the passed favorite object; the caller performs
// exactly one Lampa.Storage.set('favorite') after the batch.

// Remove a card from all mark categories except the specified one.
// Mirrors Favorite.toggle() exclusivity in src/core/favorite.js.
export function removeFromOtherMarks(favorite, cardId, exceptKey) {
    for (var i = 0; i < MARK_KEYS.length; i++) {
        var key = MARK_KEYS[i]
        if (key === exceptKey) continue
        if (!Array.isArray(favorite[key])) continue
        var idx = favorite[key].indexOf(cardId)
        if (idx !== -1) favorite[key].splice(idx, 1)
    }
}

// Find a card by id in the shared pool.
export function findCardById(cards, id) {
    if (!Array.isArray(cards)) return null
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].id == id) return cards[i]
    }
    return null
}

// Build the local element set for one category: { "type:tmdb_id": cardId }
export function localElementSet(favorite, lampaKey) {
    var set = {}
    var localIds = (lampaKey && Array.isArray(favorite[lampaKey])) ? favorite[lampaKey] : []
    for (var j = 0; j < localIds.length; j++) {
        var card = findCardById(favorite.card, localIds[j])
        if (!card || !card.id) continue
        var idNum = parseInt(card.id, 10)
        if (!idNum) continue
        set[elementKey(detectMediaType(card), idNum)] = card.id
    }
    return set
}

// Build the server element set from GET /lists/{id} items.
export function scrobElementSet(scrobItems) {
    var set = {}
    for (var i = 0; i < scrobItems.length; i++) {
        var item = scrobItems[i]
        if (item.media && item.media.tmdb_id) {
            var key = elementKey(toScrobType(item.media.type || 'movie'), item.media.tmdb_id)
            set[key] = { itemId: item.id, media: item.media }
        }
    }
    return set
}

// Apply one remote addition to the favorite object (card pool + category + marks).
export function applyRemoteAdd(favorite, lampaKey, tmdbId, media) {
    if (!tmdbId) return
    if (!Array.isArray(favorite.card)) favorite.card = []
    var card = findCardById(favorite.card, tmdbId)
    if (!card) {
        card = (media && cardFromScrobMedia(media)) || null
        if (!card) {
            card = { id: tmdbId, method: 'movie', title: String(tmdbId), poster_path: '' }
        }
        favorite.card.push(card)
    }
    if (lampaKey) {
        if (!Array.isArray(favorite[lampaKey])) favorite[lampaKey] = []
        if (favorite[lampaKey].indexOf(card.id) === -1) favorite[lampaKey].push(card.id)
        if (MARK_KEYS.indexOf(lampaKey) !== -1) removeFromOtherMarks(favorite, card.id, lampaKey)
    }
}

// Apply one remote removal to the favorite object.
export function applyRemoteRemove(favorite, lampaKey, tmdbId) {
    if (!tmdbId || !lampaKey || !Array.isArray(favorite[lampaKey])) return
    var idx = favorite[lampaKey].indexOf(tmdbId)
    if (idx !== -1) favorite[lampaKey].splice(idx, 1)
}
