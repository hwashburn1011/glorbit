import type { FastifyPluginAsync } from "fastify";
import type { SessionStreamEvent } from "@glorbit/shared";
import type { AppDeps } from "../deps.js";

export function sessionWsPlugin(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Params: { agentId: string } }>(
      "/ws/session/:agentId",
      { websocket: true },
      (socket, req) => {
        const agentId = req.params.agentId;
        const active = deps.pty.get(agentId);
        if (!active) {
          socket.send(
            JSON.stringify({
              type: "pty.exit",
              agentId,
              exitCode: null,
              t: Date.now(),
            } satisfies SessionStreamEvent),
          );
          socket.close();
          return;
        }

        const onData = (payload: { agentId: string; bytes: string }) => {
          if (payload.agentId !== agentId) return;
          const chunk: SessionStreamEvent = {
            type: "pty.data",
            agentId,
            bytes: payload.bytes,
            t: Date.now(),
          };
          try {
            socket.send(JSON.stringify(chunk));
          } catch (err) {
            deps.logger.warn({ err }, "ws/session send failed");
          }
        };

        const onExit = (payload: { agentId: string; exitCode: number | null }) => {
          if (payload.agentId !== agentId) return;
          const exit: SessionStreamEvent = {
            type: "pty.exit",
            agentId,
            exitCode: payload.exitCode,
            t: Date.now(),
          };
          try {
            socket.send(JSON.stringify(exit));
          } catch {
            // socket may already be closed
          }
          socket.close();
        };

        deps.pty.on("pty.raw", onData);
        deps.pty.on("pty.exit", onExit);

        socket.on("close", () => {
          deps.pty.off("pty.raw", onData);
          deps.pty.off("pty.exit", onExit);
        });
      },
    );
  };
}
