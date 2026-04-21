import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { healthRoutes } from "./routes/health.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);

  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: false,
  });

  await app.register(healthRoutes);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown requested");
    try {
      await app.close();
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
