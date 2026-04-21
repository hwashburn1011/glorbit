export type Provider = "claude-code" | "opencode" | "aider" | "custom";

export type ColorKey =
  | "accent"
  | "blue"
  | "violet"
  | "amber"
  | "green"
  | "pink"
  | "cyan"
  | "orange";

export type AgentStatus =
  | "running"
  | "blocked"
  | "waiting"
  | "idle"
  | "done"
  | "needs-review"
  | "error";

export interface Agent {
  id: string;
  handle: string;
  repoLabel: string;
  repoPath: string;
  provider: Provider;
  launchCmd: string;
  colorKey: ColorKey;
  avatarText: string;
  status: AgentStatus;
  currentTask: string | null;
  createdAt: number;
  lastActive: number | null;
}

export interface AgentCreateInput {
  handle: string;
  repoLabel: string;
  repoPath: string;
  provider: Provider;
  launchCmd: string;
  colorKey: ColorKey;
  avatarText: string;
}

export const HANDLE_PATTERN = /^[a-z][a-z0-9-]{1,23}$/;
