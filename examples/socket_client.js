/**
 * Reusable WebSocket client for the Scrob real-time API.
 *
 * Connects to wss://itty.ws/c/ (external mode) and listens for events
 * or sends events to the backend.
 *
 * Usage:
 *   node examples/socket_client.js
 */

import WebSocket from 'ws';

export class ScrobSocketClient {
  /**
   * @param {Object} config
   * @param {string} config.username - Scrob username
   * @param {string} config.apiKey - Scrob API key
   * @param {string} [config.url='wss://itty.ws/c/'] - WebSocket relay URL
   * @param {string} [config.namespace='gwb-scrob'] - Namespace prefix
   * @param {boolean} [config.autoReconnect=true] - Auto-reconnect on disconnect
   * @param {number} [config.maxBackoff=30000] - Max backoff in ms
   */
  constructor({
    username,
    apiKey,
    url = 'wss://itty.ws/c/',
    namespace = 'gwb-scrob',
    autoReconnect = true,
    maxBackoff = 30000,
  }) {
    this.username = username;
    this.apiKey = apiKey;
    this.url = url;
    this.namespace = namespace;
    this.autoReconnect = autoReconnect;
    this.maxBackoff = maxBackoff;

    this.ws = null;
    this.onMessageCallback = null;
    this.onConnectCallback = null;
    this.onDisconnectCallback = null;
    this.backoff = 1000;
    this._intentionalClose = false;
  }

  _buildUrl() {
    const channel = `user-${this.username}`;
    return `${this.url}${this.namespace}:${channel}?apiKey=${this.apiKey}`;
  }

  /**
   * Connect to the WebSocket server.
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      const url = this._buildUrl();
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.backoff = 1000;
        console.log(`Connected to ${url}`);
        if (this.onConnectCallback) this.onConnectCallback();
        resolve();
      });

      this.ws.on('message', (data) => {
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        // Handle ping-pong keepalive
        if (msg.type === 'ping') {
          this.ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (this.onMessageCallback) this.onMessageCallback(msg);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`Disconnected (${code}: ${reason || 'no reason'})`);
        if (this.onDisconnectCallback) this.onDisconnectCallback();

        if (!this._intentionalClose && this.autoReconnect) {
          this._scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Disconnect from the server.
   */
  disconnect() {
    this._intentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send an event to the backend.
   * @param {string} eventType - Event type (e.g. 'watch_event.created')
   * @param {Object} payload - Event payload
   */
  send(eventType, payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('not connected — call connect() first');
    }
    const msg = JSON.stringify({ type: eventType, payload });
    this.ws.send(msg);
  }

  /**
   * Set callback for incoming messages.
   * @param {(msg: Object) => void} callback
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for connection established.
   * @param {() => void} callback
   */
  onConnect(callback) {
    this.onConnectCallback = callback;
  }

  /**
   * Set callback for disconnection.
   * @param {() => void} callback
   */
  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  _scheduleReconnect() {
    console.log(`Reconnecting in ${this.backoff / 1000}s...`);
    setTimeout(() => {
      this.connect().catch((err) => {
        console.error('Reconnect failed:', err.message);
        this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
        this._scheduleReconnect();
      });
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
  }
}

// Example usage
const USERNAME = process.env.SCROB_USERNAME || 'your-username';
const API_KEY = process.env.SCROB_API_KEY || 'your-api-key';

const client = new ScrobSocketClient({
  username: USERNAME,
  apiKey: API_KEY,
});

client.onConnect(() => {
  console.log('Connected to Scrob WebSocket');
});

client.onDisconnect(() => {
  console.log('Disconnected — will auto-reconnect...');
});

client.onMessage((msg) => {
  console.log(`[${msg.type}]`, JSON.stringify(msg.payload, null, 2));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nDisconnecting...');
  client.disconnect();
  process.exit(0);
});

await client.connect();
