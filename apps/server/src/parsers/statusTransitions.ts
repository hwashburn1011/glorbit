import type { AgentStatus, MessageKind } from "@glorbit/shared";

export function statusFromKind(kind: MessageKind): AgentStatus | null {
  switch (kind) {
    case "blocker":
      return "blocked";
    case "question":
      return "waiting";
    case "done":
      return "done";
    case "artifact":
      return "needs-review";
    case "decision":
    case "summary":
    case "status":
      return "running";
    default:
      return null;
  }
}
