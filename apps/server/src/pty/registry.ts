import { EventEmitter } from "node:events";
import type { Logger } from "pino";
import { buildPreamble, HUMAN_PREFIX } from "@glorbit/shared";
import type { AppConfig } from "../config.js";
import type { GlorbitDb } from "../db/index.js";
import { transcriptPathFor } from "../db/connection.js";
import { scrubSecrets } from "./scrubber.js";
import { LineBuffer, stripAnsi } from "./lineBuffer.js";
import { openTranscript, type TranscriptWriter } from "./transcript.js";
import { spawnPty, type PtyHandle } from "./wrapper.js";

export interface ActiveAgentSession {
  agentId: string;
  handle: string;
  sessionId: string;
  pty: PtyHandle;
  transcript: TranscriptWriter;
  lineBuffer: LineBuffer;
  startedAt: number;
}

export interface PtyRegistryEvents {
  "pty.data": { agentId: string; handle: string; sessionId: string; line: string };
  "pty.raw": { agentId: string; bytes: string };
  "pty.exit": { agentId: string; sessionId: string; exitCode: number | null };
}

export interface PtyRegistryDeps {
  config: AppConfig;
  db: GlorbitDb;
  logger: Logger;
}

export class PtyRegistry extends EventEmitter {
  private readonly byAgentId = new Map<string, ActiveAgentSession>();
  constructor(private readonly deps: PtyRegistryDeps) {
    super();
  }

  has(agentId: string): boolean {
    return this.byAgentId.has(agentId);
  }

  get(agentId: string): ActiveAgentSession | null {
    return this.byAgentId.get(agentId) ?? null;
  }

  list(): ActiveAgentSession[] {
    return [...this.byAgentId.values()];
  }

  start(agentId: string): ActiveAgentSession {
    const existing = this.byAgentId.get(agentId);
    if (existing) return existing;

    const agent = this.deps.db.agents.getById(agentId);
    if (!agent) throw new Error(`PtyRegistry.start: agent ${agentId} not found`);

    const pty = spawnPty({
      launchCmd: agent.launchCmd,
      cwd: agent.repoPath,
    });

    const session = this.deps.db.sessions.startForAgent(agentId, pty.pid);
    const transcript = openTranscript(transcriptPathFor(this.deps.config, session.id));
    const lineBuffer = new LineBuffer();

    const active: ActiveAgentSession = {
      agentId,
      handle: agent.handle,
      sessionId: session.id,
      pty,
      transcript,
      lineBuffer,
      startedAt: session.startedAt,
    };
    this.byAgentId.set(agentId, active);

    pty.onData((bytes) => {
      transcript.append(bytes);
      this.emit("pty.raw", { agentId, bytes });

      const plain = stripAnsi(bytes);
      const lines = lineBuffer.push(plain);
      for (const rawLine of lines) {
        const line = scrubSecrets(rawLine);
        this.emit("pty.data", {
          agentId,
          handle: agent.handle,
          sessionId: session.id,
          line,
        });
      }
      this.deps.db.agents.patch(agentId, { lastActive: Date.now() });
    });

    pty.onExit((exitCode) => {
      void this.endInternal(active, exitCode);
    });

    pty.writeLine(buildPreamble(agent.handle));
    this.deps.db.agents.patch(agentId, { status: "running" });

    return active;
  }

  sendFromHuman(agentId: string, text: string): void {
    const active = this.byAgentId.get(agentId);
    if (!active) throw new Error(`pty for agent ${agentId} is not running`);
    active.pty.writeLine(`${HUMAN_PREFIX} ${text}`);
  }

  writeRaw(agentId: string, bytes: string): void {
    const active = this.byAgentId.get(agentId);
    if (!active) throw new Error(`pty for agent ${agentId} is not running`);
    active.pty.write(bytes);
  }

  interrupt(agentId: string): void {
    const active = this.byAgentId.get(agentId);
    if (!active) return;
    active.pty.interrupt();
  }

  async kill(agentId: string): Promise<void> {
    const active = this.byAgentId.get(agentId);
    if (!active) return;
    active.pty.kill("SIGTERM");
    const hardKill = setTimeout(() => active.pty.kill("SIGKILL"), 5000);
    await new Promise<void>((resolve) => {
      const off = active.pty.onExit(() => {
        clearTimeout(hardKill);
        off();
        resolve();
      });
    });
  }

  async killAll(): Promise<void> {
    await Promise.all([...this.byAgentId.keys()].map((id) => this.kill(id)));
  }

  private async endInternal(active: ActiveAgentSession, exitCode: number | null): Promise<void> {
    const leftover = active.lineBuffer.flush();
    for (const rawLine of leftover) {
      this.emit("pty.data", {
        agentId: active.agentId,
        handle: active.handle,
        sessionId: active.sessionId,
        line: scrubSecrets(rawLine),
      });
    }
    this.deps.db.sessions.end(active.sessionId, exitCode);
    this.deps.db.agents.patch(active.agentId, { status: exitCode === 0 ? "done" : "error" });
    await active.transcript.close();
    this.byAgentId.delete(active.agentId);
    this.emit("pty.exit", {
      agentId: active.agentId,
      sessionId: active.sessionId,
      exitCode,
    });
    this.deps.logger.info(
      { agentId: active.agentId, sessionId: active.sessionId, exitCode },
      "pty session ended",
    );
  }
}
