import type { ParsedLine, ProviderParser } from "./types.js";
import { genericParser } from "./generic.js";

const TOOL_USE_RE = /^(?:●|·|\*|-)\s*(Read|Write|Edit|Bash|Glob|Grep|Search|WebFetch|WebSearch|NotebookEdit|Task)\(([^)]{1,160})\)/;
const THINKING_RE = /^(?:\[thinking\]|\s*<thinking>)/i;
const DIFF_HUNK_RE = /^@@\s+-\d+/;
const SIGNATURE_RE = /^(?:Assistant:|Human:)\s/;

function condense(s: string, max = 120): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

const TOOL_TO_OP: Record<string, "read" | "write" | "exec" | "edit" | "search" | "other"> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  Bash: "exec",
  Glob: "search",
  Grep: "search",
  Search: "search",
  WebFetch: "exec",
  WebSearch: "search",
  NotebookEdit: "edit",
  Task: "other",
};

export const claudeCodeParser: ProviderParser = {
  name: "claude-code",
  parseLine(line, ctx): ParsedLine {
    const tool = line.match(TOOL_USE_RE);
    if (tool) {
      const name = tool[1]!;
      const arg = tool[2]!;
      return {
        kind: "op",
        opType: TOOL_TO_OP[name] ?? "other",
        summary: condense(`${name.toLowerCase()} ${arg}`),
        rawExcerpt: line,
      };
    }
    if (THINKING_RE.test(line) || DIFF_HUNK_RE.test(line) || SIGNATURE_RE.test(line)) {
      return {
        kind: "op",
        opType: "other",
        summary: condense(line),
        rawExcerpt: line,
      };
    }
    return genericParser.parseLine(line, ctx);
  },
};
