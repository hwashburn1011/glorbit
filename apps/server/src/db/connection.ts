import fs from "node:fs";
import path from "node:path";
import Database, { type Database as BetterDatabase } from "better-sqlite3";
import type { AppConfig } from "../config.js";

export type Db = BetterDatabase;

export function openDb(config: Pick<AppConfig, "dataDir" | "dbPath" | "transcriptDir">): Db {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.transcriptDir, { recursive: true });

  const db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.pragma("busy_timeout = 5000");

  return db;
}

export function closeDb(db: Db): void {
  try {
    db.close();
  } catch {
    // already closed
  }
}

export function transcriptPathFor(config: Pick<AppConfig, "transcriptDir">, sessionId: string): string {
  return path.join(config.transcriptDir, `${sessionId}.log`);
}
