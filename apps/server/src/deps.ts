import type { Logger } from "pino";
import type { AppConfig } from "./config.js";
import type { GlorbitDb } from "./db/index.js";
import type { PtyRegistry } from "./pty/registry.js";
import type { RoomEventBus } from "./bus.js";

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  db: GlorbitDb;
  pty: PtyRegistry;
  bus: RoomEventBus;
}
