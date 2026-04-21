import { EventEmitter } from "node:events";
import type { RoomEvent } from "@glorbit/shared";

export class RoomEventBus {
  private readonly emitter = new EventEmitter();

  emit(event: RoomEvent): void {
    this.emitter.emit("event", event);
  }

  on(cb: (event: RoomEvent) => void): () => void {
    this.emitter.on("event", cb);
    return () => this.emitter.off("event", cb);
  }

  subscriberCount(): number {
    return this.emitter.listenerCount("event");
  }
}
