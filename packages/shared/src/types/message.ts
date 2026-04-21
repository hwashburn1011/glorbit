export type MessageKind =
  | "summary"
  | "decision"
  | "blocker"
  | "question"
  | "artifact"
  | "done"
  | "status"
  | "instruction"
  | "note";

export type AuthorType = "agent" | "user" | "system";

export type View = "all" | "needs" | "done" | "pinned";

export interface ArtifactMeta {
  kind: "branch" | "pr" | "file" | "report";
  name: string;
  diffAdded?: number;
  diffRemoved?: number;
  testsPassed?: number;
  testsFailed?: number;
  url?: string;
}

export interface MessageMetadata {
  artifact?: ArtifactMeta;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  sessionId: string | null;
  authorType: AuthorType;
  authorId: string | null;
  kind: MessageKind;
  body: string;
  mentions: string[];
  metadata: MessageMetadata;
  createdAt: number;
  readAt: number | null;
  pinned?: boolean;
}

export interface MessageListFilters {
  view?: View;
  agentHandle?: string;
  kind?: MessageKind;
  before?: number;
  limit?: number;
}

export interface SendRequest {
  text: string;
  targets: string[];
  kind?: "instruction" | "note";
}
