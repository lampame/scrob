const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;
const MAX_MISSED_PONGS = 3;

export class PingPong {
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private missedCount = 0;

  constructor(
    private readonly sendPing: () => void,
    private readonly onDead: () => void,
  ) {}

  start(): void {
    this.stop();
    this.missedCount = 0;
    this.pingTimer = setInterval(() => this.firePing(), PING_INTERVAL_MS);
  }

  stop(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer !== null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  handlePong(): void {
    this.missedCount = 0;
    if (this.pongTimer !== null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private firePing(): void {
    this.sendPing();
    this.pongTimer = setTimeout(() => {
      this.missedCount++;
      if (this.missedCount >= MAX_MISSED_PONGS) {
        this.stop();
        this.onDead();
      }
    }, PONG_TIMEOUT_MS);
  }
}
