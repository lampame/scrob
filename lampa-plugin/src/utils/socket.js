// WebSocket client for real-time Scrob events.
// Supports external (wss via itty.ws) and internal (ws direct) modes.
// No external dependencies — native browser WebSocket only.

var ws = null
var socketConfig = null
var handlers = {}
var reconnectAttempts = 0
var reconnectTimer = null
var pendingAcks = {} // op_id -> { resolve, timer } for WS write acks (Phase B)
var lateEcho = {}    // op_id -> expiry timer: ack timed out, late echo still consumable
var ACK_TIMEOUT_MS = 5000
var LATE_ECHO_MS = 30000

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
            emitLifecycle('open')
        }

        ws.onmessage = function (event) {
            handleMessage(event.data)
        }

        ws.onclose = function (event) {
            console.log('ScrobSocket', 'disconnected', event.code)
            emitLifecycle('close')
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

// Parse incoming JSON, resolve write acks, then dispatch to registered handlers.
function handleMessage(data) {
    try {
        var msg = JSON.parse(data)
        if (msg && msg.type) {
            var opId = msg.op_id || (msg.payload && msg.payload.op_id)
            // Guarantee the Phase A own-op filter sees top-level op_id even when the
            // server echo omits it inside payload.
            if (msg.op_id && msg.payload && typeof msg.payload === 'object' && msg.payload.op_id == null) {
                msg.payload.op_id = msg.op_id
            }
            // Ack resolves before dispatch() routing; the echo still routes so the
            // own-op filter (engine.applyDelta) consumes it — resolve here, filter there.
            if (opId) resolveAck(opId, msg.payload || msg)
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

// op_id for WS writes: Lampa.Utils.uid(16) when available, else Math.random hex.
function genOpId() {
    try {
        if (typeof Lampa !== 'undefined' && Lampa.Utils && typeof Lampa.Utils.uid === 'function') {
            return Lampa.Utils.uid(16)
        }
    } catch (e) {}
    var hex = ''
    for (var i = 0; i < 16; i++) hex += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16))
    return hex
}

// Ack = any inbound message carrying a matching op_id (server echo after commit).
function resolveAck(opId, payload) {
    if (!opId) return
    if (pendingAcks[opId]) {
        var entry = pendingAcks[opId]
        delete pendingAcks[opId]
        if (entry.timer) clearTimeout(entry.timer)
        entry.resolve(payload)
        return
    }
    // Late echo after ack-timeout: the ack already rejected, just drop the marker.
    // The echo still routes to handlers where the own-op filter consumes it.
    if (lateEcho[opId]) {
        clearTimeout(lateEcho[opId])
        delete lateEcho[opId]
    }
}

// WS write with ack: resolves when the server echo with the same op_id arrives,
// rejects 'offline' / 'ack-timeout' / send error. Returns { promise, opId } so the
// caller can registerOwnOp(opId) BEFORE send (the echo filter needs it upfront);
// send() below wraps this for callers that only need the promise.
export function sendWithId(type, payload) {
    var opId = genOpId()
    var promise = new Promise(function (resolve, reject) {
        if (!scrobSocketIsConnected()) { reject('offline'); return }
        var body = null
        try {
            body = JSON.stringify({
                type: type,
                op_id: opId,
                payload: Object.assign({}, payload, { op_id: opId }),
                timestamp: new Date().toISOString()
            })
        } catch (e) { reject(e); return }
        pendingAcks[opId] = {
            resolve: resolve,
            timer: setTimeout(function () {
                if (pendingAcks[opId]) {
                    delete pendingAcks[opId]
                    lateEcho[opId] = setTimeout(function () { delete lateEcho[opId] }, LATE_ECHO_MS)
                    reject('ack-timeout')
                }
            }, ACK_TIMEOUT_MS)
        }
        try {
            ws.send(body)
        } catch (e) {
            clearTimeout(pendingAcks[opId].timer)
            delete pendingAcks[opId]
            reject(e)
        }
    })
    return { promise: promise, opId: opId }
}

export function send(type, payload) {
    return sendWithId(type, payload).promise
}

// Lifecycle hooks: 'open' converges on stale snapshot, 'close' resumes polling.
// Subscribed by sync.engine via onLifecycle (core socket open → update pattern).
var lifecycle = { open: [], close: [] }

function emitLifecycle(which) {
    var list = lifecycle[which] || []
    for (var i = 0; i < list.length; i++) {
        try { list[i]() } catch (e) { console.error('ScrobSocket', 'lifecycle error', e) }
    }
}

export function scrobSocketOnLifecycle(which, handler) {
    if (lifecycle[which] && lifecycle[which].indexOf(handler) === -1) lifecycle[which].push(handler)
}

export function scrobSocketOffLifecycle(which, handler) {
    if (lifecycle[which]) {
        lifecycle[which] = lifecycle[which].filter(function (h) { return h !== handler })
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

// Get socket interface object for sync.engine (inbound notify + Phase B WS writes
// with REST fallback in engine.writeOne).
export function getScrobSocket() {
    return {
        on: scrobSocketOn,
        off: scrobSocketOff,
        isConnected: scrobSocketIsConnected,
        onLifecycle: scrobSocketOnLifecycle,
        offLifecycle: scrobSocketOffLifecycle,
        send: send,
        sendWithId: sendWithId
    }
}
