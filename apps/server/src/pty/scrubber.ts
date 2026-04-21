const REDACTED = "«redacted»";

interface Pattern {
  name: string;
  re: RegExp;
  replace?: (match: string) => string;
}

const PATTERNS: Pattern[] = [
  { name: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "aws-secret", re: /\b[A-Za-z0-9/+=]{40}\b(?=\s*[\r\n]|$)/g },
  { name: "github-token", re: /\bghp_[A-Za-z0-9]{36,}\b/g },
  { name: "github-server-token", re: /\bghs_[A-Za-z0-9]{36,}\b/g },
  { name: "github-user-token", re: /\bgho_[A-Za-z0-9]{36,}\b/g },
  { name: "openai-key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { name: "gcp-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "slack-token", re: /\bxox[aboprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    name: "env-secret-assign",
    re: /\b([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD|PASSWD|PWD)[A-Z0-9_]*)\s*=\s*("[^"\n]+"|'[^'\n]+'|[^\s'"`$][^\s]{6,})/g,
    replace: (match) => match.replace(/=\s*.*$/, `=${REDACTED}`),
  },
];

export function scrubSecrets(text: string): string {
  let out = text;
  for (const p of PATTERNS) {
    if (p.replace) {
      out = out.replace(p.re, p.replace);
    } else {
      out = out.replace(p.re, REDACTED);
    }
  }
  return out;
}

export const SCRUB_PATTERNS = PATTERNS.map((p) => p.name);
