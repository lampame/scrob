// WebSocket client for real-time Scrob events.
// Supports external (wss via itty.ws) and internal (ws direct) modes.
// No external dependencies — native browser WebSocket only.

var ws = null
var socketConfig = null
var handlers = {}
var reconnectAttempts = 0
var reconnectTimer = null

// Build WebSocket URL based on connection mode.
// Pattern: wss://itty.ws/c/{namespace}:{channel}?joinKey={join_key}&sendKey={send_key}
function buildSocketUrl(config) {
    var channel = config.namespace + ':user-' + config.username

    if (config.mode === 'external') {
        // itty.ws relay — uses joinKey + sendKey (not apiKey)
        var base = config.externalUrl + channel
        var params = []
        if (config.joinKey) params.push('joinKey=' + encodeURIComponent(config.joinKey))
        if (config.sendKey) params.push('sendKey=' + encodeURIComponent(config.sendKey))
        return base + (params.length ? '?' + params.join('&') : '')
    }
    if (config.mode === 'internal') {
        // Self-hosted — uses joinKey + sendKey
        var base2 = 'ws://' + config.host + ':' + (config.port || 7332) + '/c/' + channel
        var params2 = []
        if (config.joinKey) params2.push('joinKey=' + encodeURIComponent(config.joinKey))
        if (config.sendKey) params2.push('sendKey=' + encodeURIComponent(config.sendKey))
        return base2 + (params2.length ? '?' + params2.join('&') : '')
    }
    return null
}

// Establish WebSocket connection with auto-reconnect.
function connect(url) {
    if (ws) {
        ws.close()
        ws = null
    }

    reconnectAttempts = 0
    reconnectTimer = null

    try {
        ws = new WebSocket(url)

        ws.onopen = function () {
            reconnectAttempts = 0
            console.log('ScrobSocket', 'connected')
        }

        ws.onmessage = function (event) {
            handleMessage(event.data)
        }

        ws.onclose = function (event) {
            console.log('ScrobSocket', 'disconnected', event.code)
            scheduleReconnect()
        }

        ws.onerror = function (error) {
            console.error('ScrobSocket', 'error', error)
        }
    } catch (e) {
        console.error('ScrobSocket', 'connection failed', e)
        scheduleReconnect()
    }
}

// Exponential backoff reconnect: 1s → 2s → 4s → ... → 30s max.
function scheduleReconnect() {
    if (reconnectTimer) return

    var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts++

    reconnectTimer = setTimeout(function () {
        reconnectTimer = null
        if (socketConfig) {
            var url = buildSocketUrl(socketConfig)
            if (url) connect(url)
        }
    }, delay)
}

// Parse incoming JSON and dispatch to registered handlers.
function handleMessage(data) {
    try {
        var msg = JSON.parse(data)
        if (msg && msg.type) {
            dispatch(msg.type, msg.payload)
        }
    } catch (e) {
        console.error('ScrobSocket', 'invalid message', e)
    }
}

// Call all registered handlers for an event type.
function dispatch(type, payload) {
    if (handlers[type]) {
        handlers[type].forEach(function (handler) {
            try {
                handler(payload)
            } catch (e) {
                console.error('ScrobSocket', 'handler error', e)
            }
        })
    }
}

// ─── Public API ───────────────────────────────────────────

// Initialize WebSocket connection.
// config: { mode, namespace, externalUrl, host, port, apiKey, username }
export function scrobSocketInit(config) {
    if (config.mode === 'disabled') {
        console.log('ScrobSocket', 'disabled mode — WebSocket not connected')
        return false
    }

    var url = buildSocketUrl(config)
    if (!url) return false

    socketConfig = config

    connect(url)
    return true
}

// Register event handler.
export function scrobSocketOn(event, handler) {
    if (!handlers[event]) handlers[event] = []
    handlers[event].push(handler)
}

// Unregister event handler.
export function scrobSocketOff(event, handler) {
    if (handlers[event]) {
        handlers[event] = handlers[event].filter(function (h) {
            return h !== handler
        })
    }
}

// Return connection state.
export function scrobSocketIsConnected() {
    return ws && ws.readyState === WebSocket.OPEN
}

// Close connection and cleanup.
export function scrobSocketDisconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    if (ws) {
        ws.close()
        ws = null
    }
    socketConfig = null
    handlers = {}
}

// Get socket interface object for sync.engine.
// Relay client is inbound-only (emit subscriptions); writes go via POST /socket/events.
export function getScrobSocket() {
    return {
        on: scrobSocketOn,
        off: scrobSocketOff,
        isConnected: scrobSocketIsConnected
    }
}
