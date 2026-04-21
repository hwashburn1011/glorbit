import type { RoomEvent } from "./shared.js";

type Listener = (event: RoomEvent) => void;

export interface RoomSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
}

export class RoomSocket {
  private socket: WebSocket | null = null;
  private closed = false;
  private reconnectDelay = 500;
  private readonly listeners = new Set<Listener>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly url: string, private readonly opts: RoomSocketOptions = {}) {}

  connect(): void {
    if (this.socket) return;
    this.closed = false;
    this.open();
  }

  private open(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectDelay = 500;
      this.opts.onOpen?.();
      this.pingTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping", t: Date.now() }));
        }
      }, 25_000);
    });

    socket.addEventListener("message", (e) => {
      try {
        const parsed = JSON.parse(String(e.data)) as RoomEvent | { type: string };
        if ("type" in parsed && parsed.type === "pong") return;
        for (const l of this.listeners) l(parsed as RoomEvent);
      } catch (err) {
        this.opts.onError?.(err);
      }
    });

    socket.addEventListener("close", () => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.socket = null;
      this.opts.onClose?.();
      if (this.closed) return;
      const delay = this.reconnectDelay;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15_000);
      setTimeout(() => this.open(), delay);
    });

    socket.addEventListener("error", (err) => this.opts.onError?.(err));
  }

  on(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  close(): void {
    this.closed = true;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}

export function roomWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/room`;
}

export function sessionWsUrl(agentId: string): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/session/${agentId}`;
}
