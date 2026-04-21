import type { FastifyPluginAsync } from "fastify";
import type { MessageKind, View } from "@glorbit/shared";
import type { AppDeps } from "../deps.js";

const VALID_VIEWS: View[] = ["all", "needs", "done", "pinned"];
const VALID_KINDS: MessageKind[] = [
  "summary",
  "decision",
  "blocker",
  "question",
  "artifact",
  "done",
  "status",
  "instruction",
  "note",
];

export function messagesRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.get<{
      Querystring: {
        view?: string;
        agent?: string;
        kind?: string;
        before?: string;
        limit?: string;
      };
    }>("/api/messages", async (req, reply) => {
      const q = req.query;
      const view = q.view ? (q.view as View) : "all";
      if (!VALID_VIEWS.includes(view)) {
        return reply.code(400).send({ error: "view invalid" });
      }
      let agentId: string | null = null;
      if (q.agent) {
        const agent = deps.db.agents.getByHandle(q.agent);
        if (!agent) return reply.code(404).send({ error: "unknown agent handle" });
        agentId = agent.id;
      }
      const kind = q.kind ? (q.kind as MessageKind) : undefined;
      if (kind && !VALID_KINDS.includes(kind)) {
        return reply.code(400).send({ error: "kind invalid" });
      }
      const before = q.before ? Number.parseInt(q.before, 10) : undefined;
      const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;

      const messages = deps.db.messages.list({
        view,
        agentId,
        kind,
        before,
        limit,
      });
      const counts = deps.db.messages.unreadCounts();
      return { messages, counts };
    });
  };
}
