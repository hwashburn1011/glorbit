const MENTION_RE = /(^|[^A-Za-z0-9_])@([a-z][a-z0-9-]{1,23})/g;

export function extractMentions(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    found.add(match[2]);
  }
  return [...found];
}

export function hasBroadcastMention(body: string): boolean {
  return /(^|\s)@all\b/i.test(body) || /^\/broadcast\b/i.test(body.trim());
}
