import type { Op, OpType } from "@glorbit/shared";
import type { Db } from "../connection.js";
import { newId } from "../../util/id.js";

interface OpRow {
  id: string;
  session_id: string;
  op_type: string;
  summary: string;
  raw_excerpt: string | null;
  created_at: number;
}

function rowToOp(row: OpRow): Op {
  return {
    id: row.id,
    sessionId: row.session_id,
    opType: row.op_type as OpType,
    summary: row.summary,
    rawExcerpt: row.raw_excerpt,
    createdAt: row.created_at,
  };
}

export interface OpInsert {
  sessionId: string;
  opType: OpType;
  summary: string;
  rawExcerpt?: string | null;
}

export function createOpsRepo(db: Db) {
  const insertStmt = db.prepare(`
    INSERT INTO ops (id, session_id, op_type, summary, raw_excerpt, created_at)
    VALUES (@id, @session_id, @op_type, @summary, @raw_excerpt, @created_at)
  `);
  const listWindowStmt = db.prepare(
    "SELECT * FROM ops WHERE session_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC",
  );

  return {
    insert(input: OpInsert): Op {
      const id = newId();
      insertStmt.run({
        id,
        session_id: input.sessionId,
        op_type: input.opType,
        summary: input.summary,
        raw_excerpt: input.rawExcerpt ?? null,
        created_at: Date.now(),
      });
      return {
        id,
        sessionId: input.sessionId,
        opType: input.opType,
        summary: input.summary,
        rawExcerpt: input.rawExcerpt ?? null,
        createdAt: Date.now(),
      };
    },
    listByWindow(sessionId: string, fromTs: number, toTs: number): Op[] {
      const rows = listWindowStmt.all(sessionId, fromTs, toTs) as OpRow[];
      return rows.map(rowToOp);
    },
  };
}

export type OpsRepo = ReturnType<typeof createOpsRepo>;
