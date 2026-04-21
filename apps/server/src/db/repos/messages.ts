import type {
  AuthorType,
  Message,
  MessageKind,
  MessageListFilters,
  MessageMetadata,
} from "@glorbit/shared";
import type { Db } from "../connection.js";
import { newId } from "../../util/id.js";

interface MessageRow {
  id: string;
  session_id: string | null;
  author_type: string;
  author_id: string | null;
  kind: string;
  body: string;
  mentions: string;
  metadata: string;
  created_at: number;
  read_at: number | null;
  pinned: 0 | 1;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    sessionId: row.session_id,
    authorType: row.author_type as AuthorType,
    authorId: row.author_id,
    kind: row.kind as MessageKind,
    body: row.body,
    mentions: parseJson<string[]>(row.mentions, []),
    metadata: parseJson<MessageMetadata>(row.metadata, {}),
    createdAt: row.created_at,
    readAt: row.read_at,
    pinned: row.pinned === 1,
  };
}

export interface MessageInsert {
  sessionId: string | null;
  authorType: AuthorType;
  authorId: string | null;
  kind: MessageKind;
  body: string;
  mentions?: string[];
  metadata?: MessageMetadata;
}

const SELECT_BASE = `
  SELECT m.*, (pm.message_id IS NOT NULL) AS pinned
  FROM messages m
  LEFT JOIN pinned_messages pm ON pm.message_id = m.id
`;

export function createMessagesRepo(db: Db) {
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, session_id, author_type, author_id, kind, body, mentions, metadata, created_at, read_at)
    VALUES (@id, @session_id, @author_type, @author_id, @kind, @body, @mentions, @metadata, @created_at, NULL)
  `);
  const getByIdStmt = db.prepare(`${SELECT_BASE} WHERE m.id = ?`);
  const markReadIdsStmt = db.prepare(
    "UPDATE messages SET read_at = @read_at WHERE id = @id AND read_at IS NULL",
  );
  const pinStmt = db.prepare(
    "INSERT OR IGNORE INTO pinned_messages (message_id, pinned_at) VALUES (?, ?)",
  );
  const unpinStmt = db.prepare("DELETE FROM pinned_messages WHERE message_id = ?");

  return {
    insert(input: MessageInsert): Message {
      const id = newId();
      insertStmt.run({
        id,
        session_id: input.sessionId,
        author_type: input.authorType,
        author_id: input.authorId,
        kind: input.kind,
        body: input.body,
        mentions: JSON.stringify(input.mentions ?? []),
        metadata: JSON.stringify(input.metadata ?? {}),
        created_at: Date.now(),
      });
      const created = this.getById(id);
      if (!created) throw new Error("messages.insert: row not visible after insert");
      return created;
    },
    getById(id: string): Message | null {
      const row = getByIdStmt.get(id) as MessageRow | undefined;
      return row ? rowToMessage(row) : null;
    },
    list(filters: MessageListFilters & { agentId?: string | null } = {}): Message[] {
      const where: string[] = [];
      const params: Record<string, unknown> = {};

      const view = filters.view ?? "all";
      if (view === "needs") {
        where.push("m.kind IN ('blocker', 'question') AND m.read_at IS NULL");
      } else if (view === "done") {
        where.push("m.kind = 'done'");
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        where.push("m.created_at >= @day_start");
        params.day_start = dayStart.getTime();
      } else if (view === "pinned") {
        where.push("pm.message_id IS NOT NULL");
      }

      if (filters.agentId) {
        where.push("m.author_id = @agent_id");
        params.agent_id = filters.agentId;
      }
      if (filters.kind) {
        where.push("m.kind = @kind");
        params.kind = filters.kind;
      }
      if (filters.before) {
        where.push("m.created_at < @before");
        params.before = filters.before;
      }

      const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
      params.limit = limit;

      const sql = `
        ${SELECT_BASE}
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY m.created_at DESC
        LIMIT @limit
      `;
      const rows = db.prepare(sql).all(params) as MessageRow[];
      return rows.map(rowToMessage).reverse();
    },
    markRead(ids: string[]): void {
      if (ids.length === 0) return;
      const readAt = Date.now();
      const tx = db.transaction((rowIds: string[]) => {
        for (const id of rowIds) {
          markReadIdsStmt.run({ id, read_at: readAt });
        }
      });
      tx(ids);
    },
    markReadForView(view: "needs", upTo: number): void {
      db.prepare(
        "UPDATE messages SET read_at = @read_at WHERE kind IN ('blocker', 'question') AND read_at IS NULL AND created_at <= @up_to",
      ).run({ read_at: Date.now(), up_to: upTo });
      void view;
    },
    pin(id: string): void {
      pinStmt.run(id, Date.now());
    },
    unpin(id: string): void {
      unpinStmt.run(id);
    },
    listPinned(): Message[] {
      const rows = db
        .prepare(
          `${SELECT_BASE} WHERE pm.message_id IS NOT NULL ORDER BY pm.pinned_at DESC`,
        )
        .all() as MessageRow[];
      return rows.map(rowToMessage);
    },
    unreadCounts(): {
      all: number;
      needs: number;
      doneToday: number;
      pinned: number;
      perAgent: Record<string, number>;
    } {
      const allRow = db
        .prepare("SELECT COUNT(*) AS n FROM messages WHERE read_at IS NULL")
        .get() as { n: number };
      const needsRow = db
        .prepare(
          "SELECT COUNT(*) AS n FROM messages WHERE kind IN ('blocker', 'question') AND read_at IS NULL",
        )
        .get() as { n: number };
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const doneRow = db
        .prepare(
          "SELECT COUNT(*) AS n FROM messages WHERE kind = 'done' AND created_at >= ?",
        )
        .get(dayStart.getTime()) as { n: number };
      const pinnedRow = db
        .prepare("SELECT COUNT(*) AS n FROM pinned_messages")
        .get() as { n: number };

      const perAgentRows = db
        .prepare(
          "SELECT author_id, COUNT(*) AS n FROM messages WHERE read_at IS NULL AND author_type = 'agent' AND author_id IS NOT NULL GROUP BY author_id",
        )
        .all() as Array<{ author_id: string; n: number }>;

      const perAgent: Record<string, number> = {};
      for (const r of perAgentRows) perAgent[r.author_id] = r.n;

      return {
        all: allRow.n,
        needs: needsRow.n,
        doneToday: doneRow.n,
        pinned: pinnedRow.n,
        perAgent,
      };
    },
  };
}

export type MessagesRepo = ReturnType<typeof createMessagesRepo>;
