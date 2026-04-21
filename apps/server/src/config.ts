import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

function findDotenv(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const starts = [process.cwd(), here];
  const seen = new Set<string>();
  for (const start of starts) {
    let dir = start;
    for (let depth = 0; depth < 8; depth += 1) {
      if (seen.has(dir)) break;
      seen.add(dir);
      const candidate = path.join(dir, ".env");
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

const envPath = findDotenv();
if (envPath) dotenv.config({ path: envPath });

export interface AppConfig {
  host: string;
  port: number;
  dataDir: string;
  transcriptDir: string;
  dbPath: string;
  summaryMinutes: number;
  logLevel: "debug" | "info" | "warn" | "error";
  seed: boolean;
  allowNonLoopback: boolean;
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid integer for env ${name}: ${raw}`);
  }
  return n;
}

function parseBoolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.toLowerCase();
  if (raw === undefined) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function parseLogLevel(): AppConfig["logLevel"] {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

export function loadConfig(argv: readonly string[] = process.argv.slice(2)): AppConfig {
  const seed = argv.includes("--seed");
  const iKnow = argv.includes("--i-know-what-im-doing");

  const host = process.env.HOST?.trim() || "127.0.0.1";
  const port = parseIntEnv("PORT", 4317);
  const allowNonLoopback =
    iKnow || parseBoolEnv("GLORBIT_ALLOW_NON_LOOPBACK", false);

  if (!LOOPBACK_HOSTS.has(host) && !allowNonLoopback) {
    throw new Error(
      `Refusing to bind on non-loopback host "${host}". Set HOST=127.0.0.1 or pass --i-know-what-im-doing.`,
    );
  }

  const dataDir =
    process.env.GLORBIT_DATA_DIR?.trim() || path.join(os.homedir(), ".glorbit");

  return {
    host,
    port,
    dataDir,
    transcriptDir: path.join(dataDir, "transcripts"),
    dbPath: path.join(dataDir, "glorbit.db"),
    summaryMinutes: parseIntEnv("GLORBIT_SUMMARY_MINUTES", 5),
    logLevel: parseLogLevel(),
    seed,
    allowNonLoopback,
  };
}
