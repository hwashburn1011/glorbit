export interface Session {
  id: string;
  agentId: string;
  pid: number | null;
  startedAt: number;
  endedAt: number | null;
  exitCode: number | null;
  tokensUsed: number;
  costUsdCents: number;
}
