import type { Logger } from "pino";
import type {
  Agent,
  AgentCreateInput,
  AgentStatus,
  MessageKind,
  OpType,
} from "@glorbit/shared";
import type { GlorbitDb } from "../db/index.js";
import type { RoomEventBus } from "../bus.js";

interface Beat {
  waitMs: number;
  action:
    | {
        type: "message";
        kind: MessageKind;
        body: string;
        status?: AgentStatus;
      }
    | { type: "op"; opType: OpType; summary: string };
}

interface FakeAgentScript {
  input: AgentCreateInput;
  beats: Beat[];
}

const SCRIPTS: FakeAgentScript[] = [
  {
    input: {
      handle: "athena",
      repoLabel: "billing-service",
      repoPath: "/fake/billing-service",
      provider: "claude-code",
      launchCmd: "claude-code",
      colorKey: "accent",
      avatarText: "At",
    },
    beats: [
      { waitMs: 800, action: { type: "op", opType: "read", summary: "read stripe-config.ts" } },
      { waitMs: 1100, action: { type: "op", opType: "search", summary: "grep -R STRIPE_KEY src" } },
      { waitMs: 1500, action: { type: "op", opType: "edit", summary: "edit migrations/0042_customer.sql" } },
      {
        waitMs: 2200,
        action: {
          type: "message",
          kind: "decision",
          body: "Going with option B for the Stripe migration — backfill with default then add NOT NULL.",
          status: "running",
        },
      },
      { waitMs: 1800, action: { type: "op", opType: "exec", summary: "ran pnpm test" } },
      {
        waitMs: 2400,
        action: {
          type: "message",
          kind: "blocker",
          body: "Need Stripe API key for staging to run migration against real data. Where do you keep it?",
          status: "blocked",
        },
      },
    ],
  },
  {
    input: {
      handle: "kestrel",
      repoLabel: "marketing-site",
      repoPath: "/fake/marketing-site",
      provider: "claude-code",
      launchCmd: "claude-code",
      colorKey: "blue",
      avatarText: "Ke",
    },
    beats: [
      { waitMs: 1200, action: { type: "op", opType: "read", summary: "read app/page.tsx" } },
      { waitMs: 900, action: { type: "op", opType: "edit", summary: "edit components/Hero.tsx" } },
      {
        waitMs: 1800,
        action: {
          type: "message",
          kind: "question",
          body: "Hero copy — do you want 'built for teams' or 'built for parallel work' as the tagline?",
          status: "waiting",
        },
      },
      { waitMs: 1400, action: { type: "op", opType: "exec", summary: "ran pnpm build" } },
      {
        waitMs: 2600,
        action: {
          type: "message",
          kind: "done",
          body: "Hero + pricing sections rewritten, build is green.",
          status: "done",
        },
      },
    ],
  },
  {
    input: {
      handle: "orion",
      repoLabel: "infra",
      repoPath: "/fake/infra",
      provider: "opencode",
      launchCmd: "opencode",
      colorKey: "cyan",
      avatarText: "Or",
    },
    beats: [
      { waitMs: 1600, action: { type: "op", opType: "exec", summary: "ran terraform plan" } },
      {
        waitMs: 2000,
        action: {
          type: "message",
          kind: "summary",
          body: "Reviewed IAM policy diffs — three new roles for the ingest pipeline. Nothing destructive.",
          status: "running",
        },
      },
      { waitMs: 1500, action: { type: "op", opType: "edit", summary: "edit main.tf" } },
      {
        waitMs: 2400,
        action: {
          type: "message",
          kind: "artifact",
          body: "Branch infra/ingest-iam pushed; opened PR #214.",
          status: "needs-review",
        },
      },
    ],
  },
  {
    input: {
      handle: "nova",
      repoLabel: "ios-app",
      repoPath: "/fake/ios-app",
      provider: "aider",
      launchCmd: "aider",
      colorKey: "pink",
      avatarText: "No",
    },
    beats: [
      { waitMs: 900, action: { type: "op", opType: "read", summary: "read ContentView.swift" } },
      { waitMs: 1100, action: { type: "op", opType: "edit", summary: "edit SettingsView.swift" } },
      {
        waitMs: 1900,
        action: {
          type: "message",
          kind: "status",
          body: "Working through the settings refactor — moving dark-mode toggle into AppStorage.",
          status: "running",
        },
      },
      { waitMs: 2200, action: { type: "op", opType: "exec", summary: "ran xcodebuild -scheme App" } },
    ],
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emitStatus(
  bus: RoomEventBus,
  agent: Agent,
  status: AgentStatus,
  db: GlorbitDb,
): void {
  db.agents.patch(agent.id, { status, lastActive: Date.now() });
  bus.emit({ type: "agent.status", agentId: agent.id, handle: agent.handle, status });
}

interface StartSeedDeps {
  db: GlorbitDb;
  bus: RoomEventBus;
  logger: Logger;
}

export async function startSeed(deps: StartSeedDeps): Promise<void> {
  const agents: Agent[] = [];
  for (const script of SCRIPTS) {
    const existing = deps.db.agents.getByHandle(script.input.handle);
    const agent = existing ?? deps.db.agents.insert(script.input);
    agents.push(agent);
    emitStatus(deps.bus, agent, "running", deps.db);
    deps.bus.emit({ type: "agent.added", agent });
  }

  void (async () => {
    const sessions = new Map<string, string>();
    for (const a of agents) {
      const s = deps.db.sessions.startForAgent(a.id, null);
      sessions.set(a.id, s.id);
    }

    while (true) {
      await Promise.all(
        SCRIPTS.map(async (script, idx) => {
          const agent = agents[idx];
          if (!agent) return;
          const sessionId = sessions.get(agent.id);
          if (!sessionId) return;
          for (const beat of script.beats) {
            await sleep(beat.waitMs);
            if (beat.action.type === "message") {
              const message = deps.db.messages.insert({
                sessionId,
                authorType: "agent",
                authorId: agent.id,
                kind: beat.action.kind,
                body: beat.action.body,
                mentions: [],
                metadata: {},
              });
              deps.bus.emit({ type: "message.new", message });
              if (beat.action.status) {
                emitStatus(deps.bus, agent, beat.action.status, deps.db);
              }
            } else {
              const op = deps.db.ops.insert({
                sessionId,
                opType: beat.action.opType,
                summary: beat.action.summary,
                rawExcerpt: null,
              });
              deps.bus.emit({ type: "op.new", op, agentHandle: agent.handle });
            }
          }
        }),
      );
      await sleep(8000);
    }
  })().catch((err) => deps.logger.error({ err }, "seed simulator errored"));

  deps.logger.info({ count: agents.length }, "seed simulator started");
}
