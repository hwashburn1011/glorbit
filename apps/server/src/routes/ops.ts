import type { FastifyPluginAsync } from "fastify";
import type { AppDeps } from "../deps.js";

export function opsRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.get<{
      Querystring: { session?: string; after?: string; before?: string };
    }>("/api/ops", async (req, reply) => {
      const sessionId = req.query.session;
      if (!sessionId) return reply.code(400).send({ error: "session query param required" });
      const after = req.query.after ? Number.parseInt(req.query.after, 10) : 0;
      const before = req.query.before ? Number.parseInt(req.query.before, 10) : Date.now();
      const ops = deps.db.ops.listByWindow(sessionId, after, before);
      return { ops };
    });
  };
}
