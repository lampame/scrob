import { SocketClient } from './client';
import type { SocketConfig, SocketMessage } from './types';

type Listener = (state: SocketState) => void;

export interface SocketState {
  connected: boolean;
  mode: SocketMode;
  logs: LogItem[];
}

export type SocketMode = 'disabled' | 'internal' | 'external';

export interface LogItem {
  time: string;
  direction: 'in' | 'out' | 'system';
  message: string;
}

let client: SocketClient | null = null;
let state: SocketState = {
  connected: false,
  mode: 'disabled',
  logs: [],
};
const listeners: Listener[] = [];

function notify() {
  for (const l of listeners) l({ ...state });
}

function addLog(direction: LogItem['direction'], message: string) {
  const time = new Date().toLocaleTimeString();
  state.logs = [...state.logs.slice(-99), { time, direction, message }];
  notify();
}

export function getSocketState(): SocketState {
  return { ...state };
}

export function subscribeSocket(listener: Listener): () => void {
  listeners.push(listener);
  listener({ ...state });
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function initSocket(config: SocketConfig): void {
  if (client) {
    client.disconnect();
    client = null;
  }

  state = { ...state, mode: config.mode, connected: false, logs: [] };
  addLog('system', `Socket mode: ${config.mode}`);

  if (config.mode === 'disabled') {
    addLog('system', 'Socket disabled');
    notify();
    return;
  }

  client = new SocketClient(config);

  client.onMessage((msg: SocketMessage) => {
    switch (msg.type) {
      case 'connected':
        state.connected = true;
        addLog('system', 'Connected');
        break;
      case 'disconnected':
        state.connected = false;
        addLog('system', `Disconnected${msg.reason ? `: ${msg.reason}` : ''}`);
        break;
      case 'ping':
        addLog('out', 'ping');
        break;
      case 'pong':
        addLog('in', 'pong');
        break;
      case 'event':
        addLog('in', JSON.stringify(msg.payload));
        break;
    }
    notify();
  });

  client.connect();
}

export function sendSocketMessage(message: string): void {
  if (!client || !state.connected) {
    addLog('system', 'Cannot send: not connected');
    notify();
    return;
  }
  try {
    const parsed = JSON.parse(message);
    client.send(parsed);
    addLog('out', message);
  } catch {
    addLog('system', 'Invalid JSON');
    notify();
  }
}

export function disconnectSocket(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
  state.connected = false;
  addLog('system', 'Disconnected by user');
  notify();
}
