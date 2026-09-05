// Scrob custom categories registry.
// Device-local storage: scrob_custom_categories (no profile suffix).
// Structure: [{ key: 'my_watchlist', title: 'My Watchlist' }]

var STORAGE_KEY = 'scrob_custom_categories'

// Parse stored array from storage
function parse(raw) {
    if (!raw || raw === 'none') return []
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch (e) { return [] }
    }
    return Array.isArray(raw) ? raw : []
}

// Get all custom categories
export function getAll() {
    return parse(Lampa.Storage.get(STORAGE_KEY, 'none'))
}

// Add a custom category (dedup by key)
export function add(key, title) {
    var list = getAll()
    for (var i = 0; i < list.length; i++) {
        if (list[i].key === key) return
    }
    list.push({ key: key, title: title })
    Lampa.Storage.set(STORAGE_KEY, list)
}

// Remove a custom category by key
export function remove(key) {
    var list = getAll()
    var filtered = []
    for (var i = 0; i < list.length; i++) {
        if (list[i].key !== key) filtered.push(list[i])
    }
    Lampa.Storage.set(STORAGE_KEY, filtered)
}

// Get a single custom category by key
export function getByKey(key) {
    var list = getAll()
    for (var i = 0; i < list.length; i++) {
        if (list[i].key === key) return list[i]
    }
    return null
}
