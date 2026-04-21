import type { FastifyPluginAsync } from "fastify";
import type { AppDeps } from "../deps.js";

export function controlRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Params: { id: string } }>(
      "/api/agents/:id/interrupt",
      async (req, reply) => {
        const agent = deps.db.agents.getById(req.params.id);
        if (!agent) return reply.code(404).send({ error: "agent not found" });
        if (!deps.pty.has(agent.id)) {
          return reply.code(409).send({ error: "agent has no live pty" });
        }
        deps.pty.interrupt(agent.id);
        return { ok: true };
      },
    );

    app.post<{ Params: { id: string } }>("/api/agents/:id/kill", async (req, reply) => {
      const agent = deps.db.agents.getById(req.params.id);
      if (!agent) return reply.code(404).send({ error: "agent not found" });
      if (!deps.pty.has(agent.id)) {
        return reply.code(409).send({ error: "agent has no live pty" });
      }
      await deps.pty.kill(agent.id);
      return { ok: true };
    });

    app.post("/api/kill-all", async () => {
      await deps.pty.killAll();
      return { ok: true };
    });
  };
}
