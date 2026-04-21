import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/health", async () => ({
    ok: true,
    service: "glorbit",
    ts: Date.now(),
    uptimeSeconds: Math.round(process.uptime()),
  }));
};
