export type SocketMode = 'disabled' | 'internal' | 'external';

export interface SocketConfig {
  mode: SocketMode;
  namespace: string;
  channelName: string;
  joinKey?: string;
  sendKey?: string;
  serverUrl: string;
}

export type SocketMessage = 
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'event'; payload: unknown }
  | { type: 'connected' }
  | { type: 'disconnected'; reason?: string };
