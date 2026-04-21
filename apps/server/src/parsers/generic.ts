import type { OpType } from "@glorbit/shared";
import type { ProviderParser, ParsedLine } from "./types.js";

const SHELL_PROMPT_RE = /^(?:[\w./-]*[$#>]\s|\$\s|#\s|>\s)(.+)$/;

const VERB_MAP: Array<{ re: RegExp; opType: OpType }> = [
  { re: /^(?:cat|less|head|tail|bat|more|view)\b/, opType: "read" },
  { re: /^(?:ls|find|ripgrep|rg|grep|ag|fzf)\b/, opType: "search" },
  { re: /^(?:vim|nvim|nano|code|emacs|sed\s+-i|awk)\b/, opType: "edit" },
  {
    re: /^(?:npm|pnpm|yarn|bun|node|python|python3|pytest|jest|vitest|cargo|go|mvn|gradle|make|just|bundle|rake|bash|sh)\b/,
    opType: "exec",
  },
  { re: /^(?:git\s+(?:commit|push|checkout|branch|merge|rebase|tag|add|rm))\b/, opType: "write" },
  { re: /^(?:git\s+(?:status|log|diff|show|stash\s+list|branch\s+-l))\b/, opType: "read" },
  { re: /^(?:echo|printf)\b/, opType: "exec" },
  { re: /^(?:mkdir|touch|mv|cp|rm|ln)\b/, opType: "write" },
  { re: /^(?:curl|wget|fetch)\b/, opType: "exec" },
  { re: /^(?:docker|kubectl|terraform|ansible|helm)\b/, opType: "exec" },
];

function condense(s: string, max = 120): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

function classifyCommand(cmd: string): OpType {
  for (const entry of VERB_MAP) {
    if (entry.re.test(cmd)) return entry.opType;
  }
  return "other";
}

export const genericParser: ProviderParser = {
  name: "generic",
  parseLine(line): ParsedLine {
    const prompt = line.match(SHELL_PROMPT_RE);
    if (!prompt) return null;
    const cmd = prompt[1]!.trim();
    if (!cmd) return null;
    return {
      kind: "op",
      opType: classifyCommand(cmd),
      summary: condense(`ran ${cmd}`),
      rawExcerpt: line,
    };
  },
};
