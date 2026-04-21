import pino, { type Logger } from "pino";
import type { AppConfig } from "./config.js";

export function createLogger(config: Pick<AppConfig, "logLevel">): Logger {
  const isDev = process.env.NODE_ENV !== "production";
  return pino({
    level: config.logLevel,
    base: { app: "glorbit" },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: isDev
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: false,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname,app",
          },
        }
      : undefined,
  });
}

export type { Logger };
