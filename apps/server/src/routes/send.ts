import type { FastifyPluginAsync } from "fastify";
import type { SendRequest } from "@glorbit/shared";
import type { AppDeps } from "../deps.js";
import { scrubSecrets } from "../pty/scrubber.js";

function coerceSendBody(body: unknown): SendRequest {
  if (!body || typeof body !== "object") throw new Error("body must be an object");
  const b = body as Record<string, unknown>;
  const text = String(b.text ?? "").trim();
  if (!text) throw new Error("text required");
  const rawTargets = Array.isArray(b.targets) ? b.targets : [];
  const targets = rawTargets.map(String).filter(Boolean);
  const kind = b.kind === "note" ? "note" : "instruction";
  return { text, targets, kind };
}

export function sendRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: unknown }>("/api/send", async (req, reply) => {
      let parsed: SendRequest;
      try {
        parsed = coerceSendBody(req.body);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }

      const scrubbedText = scrubSecrets(parsed.text);
      const isBroadcast = parsed.targets.includes("*");
      const isNote = !isBroadcast && parsed.targets.length === 0;

      const resolveHandle = (handle: string) => deps.db.agents.getByHandle(handle);

      let targetAgents: Array<{ id: string; handle: string }> = [];
      if (isBroadcast) {
        targetAgents = deps.db.agents
          .list()
          .filter((a) => deps.pty.has(a.id))
          .map((a) => ({ id: a.id, handle: a.handle }));
      } else if (!isNote) {
        for (const handle of parsed.targets) {
          const agent = resolveHandle(handle);
          if (!agent) {
            return reply.code(404).send({ error: `unknown handle: ${handle}` });
          }
          if (!deps.pty.has(agent.id)) {
            return reply.code(409).send({ error: `${handle} is not running` });
          }
          targetAgents.push({ id: agent.id, handle: agent.handle });
        }
      }

      for (const t of targetAgents) {
        deps.pty.sendFromHuman(t.id, scrubbedText);
      }

      const kind = isNote ? "note" : "instruction";
      const mentions = targetAgents.map((a) => a.handle);
      const message = deps.db.messages.insert({
        sessionId: null,
        authorType: "user",
        authorId: null,
        kind,
        body: scrubbedText,
        mentions: isBroadcast ? ["all"] : mentions,
        metadata: isBroadcast ? { broadcast: true } : {},
      });
      deps.bus.emit({ type: "message.new", message });

      return reply.code(201).send({
        message,
        routed: {
          broadcast: isBroadcast,
          note: isNote,
          agents: mentions,
        },
      });
    });
  };
}
