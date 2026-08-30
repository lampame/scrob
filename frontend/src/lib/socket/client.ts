import type { SocketConfig, SocketMessage } from './types';
import { PingPong } from './ping-pong';

const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

type MessageHandler = (msg: SocketMessage) => void;

export class SocketClient {
  private ws: WebSocket | null = null;
  private pingPong: PingPong | null = null;
  private retryDelay = BASE_RETRY_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: MessageHandler[] = [];
  private intentionalClose = false;

  constructor(private readonly config: SocketConfig) {}

  connect(): void {
    if (this.config.mode === 'disabled') return;
    this.intentionalClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.stopRetry();
    this.pingPong?.stop();
    this.pingPong = null;
    this.ws?.close();
    this.ws = null;
  }

  send(message: SocketMessage): void {
    if (this.config.mode === 'disabled') return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  private buildUrl(): string {
    const url = new URL(this.config.serverUrl);
    url.searchParams.set('namespace', this.config.namespace);
    url.searchParams.set('channel', this.config.channelName);
    if (this.config.joinKey) url.searchParams.set('joinKey', this.config.joinKey);
    if (this.config.sendKey) url.searchParams.set('sendKey', this.config.sendKey);
    return url.toString();
  }

  private openSocket(): void {
    this.stopRetry();
    const ws = new WebSocket(this.buildUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.retryDelay = BASE_RETRY_MS;
      this.pingPong = new PingPong(
        () => this.send({ type: 'ping' }),
        () => this.handleDead(),
      );
      this.pingPong.start();
      this.emit({ type: 'connected' });
    };

    ws.onmessage = (ev: MessageEvent) => {
      let msg: SocketMessage;
      try {
        msg = JSON.parse(ev.data as string) as SocketMessage;
      } catch {
        return;
      }
      if (msg.type === 'pong') {
        this.pingPong?.handlePong();
      }
      this.emit(msg);
    };

    ws.onclose = (ev: CloseEvent) => {
      this.pingPong?.stop();
      this.pingPong = null;
      this.emit({ type: 'disconnected', reason: ev.reason || undefined });
      if (!this.intentionalClose) this.scheduleRetry();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private handleDead(): void {
    this.emit({ type: 'disconnected', reason: 'keepalive-failed' });
    this.ws?.close();
    // onclose handler triggers retry
  }

  private scheduleRetry(): void {
    this.stopRetry();
    this.retryTimer = setTimeout(() => {
      this.openSocket();
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
    }, this.retryDelay);
  }

  private stopRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private emit(msg: SocketMessage): void {
    for (const h of this.handlers) h(msg);
  }
}
