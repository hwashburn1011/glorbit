import type { FastifyPluginAsync } from "fastify";
import type { AppDeps } from "../deps.js";

export function pinsAndReadRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Params: { id: string } }>("/api/messages/:id/pin", async (req, reply) => {
      const m = deps.db.messages.getById(req.params.id);
      if (!m) return reply.code(404).send({ error: "message not found" });
      deps.db.messages.pin(m.id);
      return { ok: true, pinned: true };
    });

    app.delete<{ Params: { id: string } }>("/api/messages/:id/pin", async (req, reply) => {
      const m = deps.db.messages.getById(req.params.id);
      if (!m) return reply.code(404).send({ error: "message not found" });
      deps.db.messages.unpin(m.id);
      return { ok: true, pinned: false };
    });

    app.post<{ Body: { ids?: unknown; view?: unknown; upTo?: unknown } }>(
      "/api/messages/mark-read",
      async (req, reply) => {
        const body = req.body ?? {};
        if (Array.isArray(body.ids)) {
          const ids = body.ids.map(String).filter(Boolean);
          deps.db.messages.markRead(ids);
          return { ok: true, count: ids.length };
        }
        if (body.view === "needs") {
          const upTo = typeof body.upTo === "number" ? body.upTo : Date.now();
          deps.db.messages.markReadForView("needs", upTo);
          return { ok: true, upTo };
        }
        return reply.code(400).send({ error: "provide ids[] or view='needs'" });
      },
    );
  };
}
