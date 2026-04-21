import type {
  Agent,
  AgentCreateInput,
  AgentStatus,
  ColorKey,
  Provider,
} from "@glorbit/shared";
import type { Db } from "../connection.js";
import { newId } from "../../util/id.js";

interface AgentRow {
  id: string;
  handle: string;
  repo_label: string;
  repo_path: string;
  provider: string;
  launch_cmd: string;
  color_key: string;
  avatar_text: string;
  status: string;
  current_task: string | null;
  created_at: number;
  last_active: number | null;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    handle: row.handle,
    repoLabel: row.repo_label,
    repoPath: row.repo_path,
    provider: row.provider as Provider,
    launchCmd: row.launch_cmd,
    colorKey: row.color_key as ColorKey,
    avatarText: row.avatar_text,
    status: row.status as AgentStatus,
    currentTask: row.current_task,
    createdAt: row.created_at,
    lastActive: row.last_active,
  };
}

export interface AgentPatch {
  status?: AgentStatus;
  currentTask?: string | null;
  colorKey?: ColorKey;
  avatarText?: string;
  lastActive?: number;
}

export function createAgentsRepo(db: Db) {
  const listStmt = db.prepare("SELECT * FROM agents ORDER BY created_at ASC");
  const getByIdStmt = db.prepare("SELECT * FROM agents WHERE id = ?");
  const getByHandleStmt = db.prepare("SELECT * FROM agents WHERE handle = ?");
  const insertStmt = db.prepare(`
    INSERT INTO agents (id, handle, repo_label, repo_path, provider, launch_cmd, color_key, avatar_text, status, current_task, created_at, last_active)
    VALUES (@id, @handle, @repo_label, @repo_path, @provider, @launch_cmd, @color_key, @avatar_text, @status, @current_task, @created_at, @last_active)
  `);
  const deleteStmt = db.prepare("DELETE FROM agents WHERE id = ?");

  return {
    list(): Agent[] {
      return (listStmt.all() as AgentRow[]).map(rowToAgent);
    },
    getById(id: string): Agent | null {
      const row = getByIdStmt.get(id) as AgentRow | undefined;
      return row ? rowToAgent(row) : null;
    },
    getByHandle(handle: string): Agent | null {
      const row = getByHandleStmt.get(handle) as AgentRow | undefined;
      return row ? rowToAgent(row) : null;
    },
    insert(input: AgentCreateInput): Agent {
      const now = Date.now();
      const id = newId();
      insertStmt.run({
        id,
        handle: input.handle,
        repo_label: input.repoLabel,
        repo_path: input.repoPath,
        provider: input.provider,
        launch_cmd: input.launchCmd,
        color_key: input.colorKey,
        avatar_text: input.avatarText,
        status: "idle",
        current_task: null,
        created_at: now,
        last_active: null,
      });
      const created = this.getById(id);
      if (!created) throw new Error("agents.insert: row not visible after insert");
      return created;
    },
    patch(id: string, patch: AgentPatch): Agent | null {
      const sets: string[] = [];
      const params: Record<string, unknown> = { id };
      if (patch.status !== undefined) {
        sets.push("status = @status");
        params.status = patch.status;
      }
      if (patch.currentTask !== undefined) {
        sets.push("current_task = @current_task");
        params.current_task = patch.currentTask;
      }
      if (patch.colorKey !== undefined) {
        sets.push("color_key = @color_key");
        params.color_key = patch.colorKey;
      }
      if (patch.avatarText !== undefined) {
        sets.push("avatar_text = @avatar_text");
        params.avatar_text = patch.avatarText;
      }
      if (patch.lastActive !== undefined) {
        sets.push("last_active = @last_active");
        params.last_active = patch.lastActive;
      }
      if (sets.length === 0) return this.getById(id);
      db.prepare(`UPDATE agents SET ${sets.join(", ")} WHERE id = @id`).run(params);
      return this.getById(id);
    },
    delete(id: string): void {
      deleteStmt.run(id);
    },
  };
}

export type AgentsRepo = ReturnType<typeof createAgentsRepo>;
