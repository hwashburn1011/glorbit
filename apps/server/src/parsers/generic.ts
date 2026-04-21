import type { ProviderParser, ParsedLine } from "./types.js";

const SHELL_PROMPT_RE = /^(?:[\w./-]*[$#>]\s|\$\s|#\s|>\s)(.+)$/;

function classify(cmd: string): { opType: ParsedLine extends infer _ ? never : never } | null {
  return null;
  void cmd;
}

const VERB_MAP: Array<{ re: RegExp; opType: "read" | "write" | "exec" | "edit" | "search" | "other" }> = [
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

export const genericParser: ProviderParser = {
  name: "generic",
  parseLine(line): ParsedLine {
    void classify;
    const prompt = line.match(SHELL_PROMPT_RE);
    if (prompt) {
      const cmd = prompt[1]!.trim();
      if (!cmd) return null;
      for (const entry of VERB_MAP) {
        if (entry.re.test(cmd)) {
          return {
            kind: "op",
            opType: entry.opType,
            summary: condense(`ran ${cmd}`),
            rawExcerpt: line,
          };
        }
      }
      return {
        kind: "op",
        opType: "other",
        summary: condense(`ran ${cmd}`),
        rawExcerpt: line,
      };
    }
    return null;
  },
};
