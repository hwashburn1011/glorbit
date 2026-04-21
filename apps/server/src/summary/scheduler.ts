import type { Logger } from "pino";
import { SUMMARY_NUDGE } from "@glorbit/shared";
import type { GlorbitDb } from "../db/index.js";
import type { PtyRegistry } from "../pty/registry.js";

const RECENT_MESSAGE_WINDOW_MS = 2 * 60 * 1000;

export interface SummarySchedulerDeps {
  db: GlorbitDb;
  pty: PtyRegistry;
  logger: Logger;
  intervalMinutes: number;
}

export class SummaryScheduler {
  private timer: NodeJS.Timeout | null = null;
  constructor(private readonly deps: SummarySchedulerDeps) {}

  start(): void {
    if (this.timer) return;
    const intervalMs = Math.max(1, this.deps.intervalMinutes) * 60 * 1000;
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.deps.logger.info({ intervalMinutes: this.deps.intervalMinutes }, "summary scheduler started");
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const now = Date.now();
    for (const active of this.deps.pty.list()) {
      const recent = this.deps.db.messages.list({
        agentId: active.agentId,
        before: now + 1,
        limit: 1,
      });
      const latestTagged = recent.at(-1);
      if (latestTagged && now - latestTagged.createdAt < RECENT_MESSAGE_WINDOW_MS) {
        continue;
      }
      try {
        active.pty.writeLine(SUMMARY_NUDGE);
      } catch (err) {
        this.deps.logger.warn({ err, agentId: active.agentId }, "summary nudge failed");
      }
    }
  }
}
