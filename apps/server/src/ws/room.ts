import type { FastifyPluginAsync } from "fastify";
import type { AppDeps } from "../deps.js";

export function roomWsPlugin(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.get("/ws/room", { websocket: true }, (socket /* WebSocket */) => {
      const unsubscribe = deps.bus.on((event) => {
        try {
          socket.send(JSON.stringify(event));
        } catch (err) {
          deps.logger.warn({ err }, "ws/room send failed");
        }
      });

      socket.on("message", (raw: Buffer | ArrayBuffer | string) => {
        try {
          const text =
            typeof raw === "string"
              ? raw
              : Buffer.isBuffer(raw)
                ? raw.toString("utf8")
                : Buffer.from(raw).toString("utf8");
          const parsed = JSON.parse(text) as { type?: string; t?: number };
          if (parsed.type === "ping") {
            socket.send(JSON.stringify({ type: "pong", t: parsed.t ?? Date.now() }));
          }
        } catch {
          // malformed frames are ignored
        }
      });

      socket.on("close", () => {
        unsubscribe();
      });
    });
  };
}
