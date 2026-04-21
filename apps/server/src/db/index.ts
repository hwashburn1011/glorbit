import type { AppConfig } from "../config.js";
import { closeDb, openDb, type Db } from "./connection.js";
import { initSchema } from "./schema.js";
import { createAgentsRepo, type AgentsRepo } from "./repos/agents.js";
import { createSessionsRepo, type SessionsRepo } from "./repos/sessions.js";
import { createMessagesRepo, type MessagesRepo } from "./repos/messages.js";
import { createOpsRepo, type OpsRepo } from "./repos/ops.js";

export interface GlorbitDb {
  raw: Db;
  agents: AgentsRepo;
  sessions: SessionsRepo;
  messages: MessagesRepo;
  ops: OpsRepo;
  close(): void;
}

export function createDb(config: AppConfig): GlorbitDb {
  const db = openDb(config);
  initSchema(db);
  return {
    raw: db,
    agents: createAgentsRepo(db),
    sessions: createSessionsRepo(db),
    messages: createMessagesRepo(db),
    ops: createOpsRepo(db),
    close() {
      closeDb(db);
    },
  };
}

export type { AgentsRepo, SessionsRepo, MessagesRepo, OpsRepo };
