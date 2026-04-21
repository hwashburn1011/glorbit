import type { Logger } from "pino";
import type { Message, Op, Provider } from "@glorbit/shared";
import type { GlorbitDb } from "../db/index.js";
import type { PtyRegistry } from "../pty/registry.js";
import { TagStreamer, type TagMatch } from "./tags.js";
import { extractMentions } from "./mentions.js";
import { parserFor } from "./registry.js";
import { statusFromKind } from "./statusTransitions.js";
import type { ParserContext } from "./types.js";

interface PipelineDeps {
  db: GlorbitDb;
  pty: PtyRegistry;
  logger: Logger;
  emit: {
    message(m: Message, agentHandle: string): void;
    op(o: Op, agentHandle: string): void;
    agentStatus(agentId: string, handle: string, status: string): void;
  };
}

interface PerAgentState {
  streamer: TagStreamer;
  providerCtx: ParserContext;
  provider: Provider;
  lastSessionId: string | null;
  lastHandle: string;
}

export function wirePipeline(deps: PipelineDeps): void {
  const states = new Map<string, PerAgentState>();

  function ensureState(agentId: string): PerAgentState {
    let st = states.get(agentId);
    if (!st) {
      const agent = deps.db.agents.getById(agentId);
      if (!agent) throw new Error(`wirePipeline: unknown agent ${agentId}`);
      st = {
        streamer: new TagStreamer(),
        providerCtx: { handle: agent.handle },
        provider: agent.provider,
        lastSessionId: null,
        lastHandle: agent.handle,
      };
      states.set(agentId, st);
    }
    return st;
  }

  function writeTag(
    agentId: string,
    handle: string,
    sessionId: string | null,
    match: TagMatch | null,
  ): void {
    if (!match) return;
    const mentions = extractMentions(match.body);
    const inserted = deps.db.messages.insert({
      sessionId,
      authorType: "agent",
      authorId: agentId,
      kind: match.kind,
      body: match.body,
      mentions,
      metadata: {},
    });
    deps.emit.message(inserted, handle);

    const nextStatus = statusFromKind(match.kind);
    if (nextStatus) {
      deps.db.agents.patch(agentId, { status: nextStatus });
      deps.emit.agentStatus(agentId, handle, nextStatus);
    }
  }

  deps.pty.on("pty.data", (payload: { agentId: string; handle: string; sessionId: string; line: string }) => {
    const st = ensureState(payload.agentId);
    st.lastSessionId = payload.sessionId;
    st.lastHandle = payload.handle;
    const parser = parserFor(st.provider);

    const prevFlush = st.streamer.push(payload.line);
    if (prevFlush) {
      writeTag(payload.agentId, payload.handle, payload.sessionId, prevFlush);
    }

    const parsed = parser.parseLine(payload.line, st.providerCtx);
    if (!parsed) return;

    if (parsed.kind === "op") {
      const op = deps.db.ops.insert({
        sessionId: payload.sessionId,
        opType: parsed.opType,
        summary: parsed.summary,
        rawExcerpt: parsed.rawExcerpt ?? null,
      });
      deps.emit.op(op, payload.handle);
    }
  });

  deps.pty.on("pty.exit", ({ agentId }: { agentId: string }) => {
    const st = states.get(agentId);
    if (!st) return;
    const flushed = st.streamer.flush();
    writeTag(agentId, st.lastHandle, st.lastSessionId, flushed);
    states.delete(agentId);
  });

  deps.logger.info("parser pipeline wired");
}
