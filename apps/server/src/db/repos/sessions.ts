import type { Session } from "@glorbit/shared";
import type { Db } from "../connection.js";
import { newId } from "../../util/id.js";

interface SessionRow {
  id: string;
  agent_id: string;
  pid: number | null;
  started_at: number;
  ended_at: number | null;
  exit_code: number | null;
  tokens_used: number;
  cost_usd_cents: number;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    agentId: row.agent_id,
    pid: row.pid,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    exitCode: row.exit_code,
    tokensUsed: row.tokens_used,
    costUsdCents: row.cost_usd_cents,
  };
}

export interface SessionStatsPatch {
  tokensUsed?: number;
  costUsdCents?: number;
}

export function createSessionsRepo(db: Db) {
  const getByIdStmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  const liveForAgentStmt = db.prepare(
    "SELECT * FROM sessions WHERE agent_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
  );
  const listLiveStmt = db.prepare("SELECT * FROM sessions WHERE ended_at IS NULL");
  const insertStmt = db.prepare(`
    INSERT INTO sessions (id, agent_id, pid, started_at, ended_at, exit_code, tokens_used, cost_usd_cents)
    VALUES (@id, @agent_id, @pid, @started_at, NULL, NULL, 0, 0)
  `);
  const endStmt = db.prepare(
    "UPDATE sessions SET ended_at = @ended_at, exit_code = @exit_code WHERE id = @id",
  );

  return {
    getById(id: string): Session | null {
      const row = getByIdStmt.get(id) as SessionRow | undefined;
      return row ? rowToSession(row) : null;
    },
    liveForAgent(agentId: string): Session | null {
      const row = liveForAgentStmt.get(agentId) as SessionRow | undefined;
      return row ? rowToSession(row) : null;
    },
    listLive(): Session[] {
      return (listLiveStmt.all() as SessionRow[]).map(rowToSession);
    },
    startForAgent(agentId: string, pid: number | null): Session {
      const id = newId();
      insertStmt.run({
        id,
        agent_id: agentId,
        pid,
        started_at: Date.now(),
      });
      const created = this.getById(id);
      if (!created) throw new Error("sessions.startForAgent: row not visible after insert");
      return created;
    },
    end(id: string, exitCode: number | null): void {
      endStmt.run({ id, ended_at: Date.now(), exit_code: exitCode });
    },
    updateStats(id: string, patch: SessionStatsPatch): void {
      const sets: string[] = [];
      const params: Record<string, unknown> = { id };
      if (patch.tokensUsed !== undefined) {
        sets.push("tokens_used = @tokens_used");
        params.tokens_used = patch.tokensUsed;
      }
      if (patch.costUsdCents !== undefined) {
        sets.push("cost_usd_cents = @cost_usd_cents");
        params.cost_usd_cents = patch.costUsdCents;
      }
      if (sets.length === 0) return;
      db.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE id = @id`).run(params);
    },
  };
}

export type SessionsRepo = ReturnType<typeof createSessionsRepo>;
