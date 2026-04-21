export type OpType = "read" | "write" | "exec" | "edit" | "search" | "other";

export interface Op {
  id: string;
  sessionId: string;
  opType: OpType;
  summary: string;
  rawExcerpt: string | null;
  createdAt: number;
}

export interface OpsGroupSummary {
  count: number;
  agentHandle: string;
  fromTs: number;
  toTs: number;
  sampleSummaries: string[];
}
