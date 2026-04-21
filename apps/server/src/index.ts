import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createDb } from "./db/index.js";
import { RoomEventBus } from "./bus.js";
import { PtyRegistry } from "./pty/registry.js";
import { wirePipeline } from "./parsers/pipeline.js";
import { healthRoutes } from "./routes/health.js";
import { agentsRoutes } from "./routes/agents.js";
import { messagesRoutes } from "./routes/messages.js";
import { opsRoutes } from "./routes/ops.js";
import { sendRoutes } from "./routes/send.js";
import { controlRoutes } from "./routes/control.js";
import { pinsAndReadRoutes } from "./routes/pins.js";
import { roomWsPlugin } from "./ws/room.js";
import { sessionWsPlugin } from "./ws/session.js";
import { SummaryScheduler } from "./summary/scheduler.js";
import type { AppDeps } from "./deps.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);

  const db = createDb(config);
  const bus = new RoomEventBus();
  const pty = new PtyRegistry({ config, db, logger });

  wirePipeline({
    db,
    pty,
    logger,
    emit: {
      message(message) {
        bus.emit({ type: "message.new", message });
      },
      op(op, agentHandle) {
        bus.emit({ type: "op.new", op, agentHandle });
      },
      agentStatus(agentId, handle, status) {
        bus.emit({
          type: "agent.status",
          agentId,
          handle,
          status: status as never,
        });
      },
    },
  });

  const deps: AppDeps = { config, logger, db, pty, bus };

  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: false,
  });

  await app.register(websocket);

  await app.register(healthRoutes);
  await app.register(agentsRoutes(deps));
  await app.register(messagesRoutes(deps));
  await app.register(opsRoutes(deps));
  await app.register(sendRoutes(deps));
  await app.register(controlRoutes(deps));
  await app.register(pinsAndReadRoutes(deps));
  await app.register(roomWsPlugin(deps));
  await app.register(sessionWsPlugin(deps));

  const summary = new SummaryScheduler({
    db,
    pty,
    logger,
    intervalMinutes: config.summaryMinutes,
  });
  summary.start();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown requested");
    try {
      summary.stop();
      await pty.killAll();
      await app.close();
      db.close();
      logger.info("server closed");
    } catch (err) {
      logger.error({ err }, "error during shutdown");
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    const address = await app.listen({ host: config.host, port: config.port });
    logger.info({ address, dataDir: config.dataDir, seed: config.seed }, "glorbit server ready");
  } catch (err) {
    logger.error({ err }, "failed to start server");
    process.exit(1);
  }
}

void main();
