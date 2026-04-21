import fs from "node:fs";
import type { FastifyPluginAsync } from "fastify";
import type {
  Agent,
  AgentCreateInput,
  AgentStatus,
  ColorKey,
  Provider,
} from "@glorbit/shared";
import { HANDLE_PATTERN } from "@glorbit/shared";
import type { AppDeps } from "../deps.js";

const VALID_PROVIDERS: Provider[] = ["claude-code", "opencode", "aider", "custom"];
const VALID_COLORS: ColorKey[] = [
  "accent",
  "blue",
  "violet",
  "amber",
  "green",
  "pink",
  "cyan",
  "orange",
];
const VALID_STATUSES: AgentStatus[] = [
  "running",
  "blocked",
  "waiting",
  "idle",
  "done",
  "needs-review",
  "error",
];

function validateCreate(body: unknown): AgentCreateInput {
  if (!body || typeof body !== "object") throw new Error("body must be an object");
  const b = body as Record<string, unknown>;
  const handle = String(b.handle ?? "");
  if (!HANDLE_PATTERN.test(handle)) {
    throw new Error("handle must match ^[a-z][a-z0-9-]{1,23}$");
  }
  const repoPath = String(b.repoPath ?? "");
  if (!repoPath || !fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
    throw new Error("repoPath must be an existing directory");
  }
  const provider = String(b.provider ?? "");
  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    throw new Error("provider invalid");
  }
  const colorKey = String(b.colorKey ?? "");
  if (!VALID_COLORS.includes(colorKey as ColorKey)) {
    throw new Error("colorKey invalid");
  }
  return {
    handle,
    repoLabel: String(b.repoLabel ?? handle),
    repoPath,
    provider: provider as Provider,
    launchCmd: String(b.launchCmd ?? ""),
    colorKey: colorKey as ColorKey,
    avatarText: String(b.avatarText ?? handle.slice(0, 2)),
  };
}

export function agentsRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.get("/api/agents", async () => {
      return { agents: deps.db.agents.list() };
    });

    app.post<{ Body: unknown }>("/api/agents", async (req, reply) => {
      let input: AgentCreateInput;
      try {
        input = validateCreate(req.body);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      if (!input.launchCmd) {
        return reply.code(400).send({ error: "launchCmd required" });
      }
      if (deps.db.agents.getByHandle(input.handle)) {
        return reply.code(409).send({ error: "handle already exists" });
      }

      const agent = deps.db.agents.insert(input);
      try {
        deps.pty.start(agent.id);
      } catch (err) {
        deps.logger.error({ err, agentId: agent.id }, "failed to start pty after create");
        deps.db.agents.delete(agent.id);
        return reply.code(500).send({ error: "failed to start pty" });
      }
      const created = deps.db.agents.getById(agent.id)!;
      deps.bus.emit({ type: "agent.added", agent: created });
      return reply.code(201).send({ agent: created });
    });

    app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
      "/api/agents/:id",
      async (req, reply) => {
        const body = req.body ?? {};
        const patch: Parameters<typeof deps.db.agents.patch>[1] = {};
        if ("status" in body) {
          const s = String(body.status);
          if (!VALID_STATUSES.includes(s as AgentStatus)) {
            return reply.code(400).send({ error: "status invalid" });
          }
          patch.status = s as AgentStatus;
        }
        if ("currentTask" in body) {
          patch.currentTask = body.currentTask === null ? null : String(body.currentTask);
        }
        if ("colorKey" in body) {
          const c = String(body.colorKey);
          if (!VALID_COLORS.includes(c as ColorKey)) {
            return reply.code(400).send({ error: "colorKey invalid" });
          }
          patch.colorKey = c as ColorKey;
        }
        if ("avatarText" in body) {
          patch.avatarText = String(body.avatarText).slice(0, 3);
        }
        const updated = deps.db.agents.patch(req.params.id, patch);
        if (!updated) return reply.code(404).send({ error: "agent not found" });
        if (patch.status) {
          deps.bus.emit({
            type: "agent.status",
            agentId: updated.id,
            handle: updated.handle,
            status: updated.status,
          });
        }
        return { agent: updated };
      },
    );

    app.delete<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
      const agent = deps.db.agents.getById(req.params.id);
      if (!agent) return reply.code(404).send({ error: "agent not found" });
      if (deps.pty.has(agent.id)) {
        await deps.pty.kill(agent.id);
      }
      deps.db.agents.delete(agent.id);
      deps.bus.emit({ type: "agent.removed", agentId: agent.id, handle: agent.handle });
      return { ok: true };
    });
  };
}

export type { Agent };
