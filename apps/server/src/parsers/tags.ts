import type { MessageKind } from "@glorbit/shared";
import { GLORBIT_TAGS, type GlorbitTag } from "@glorbit/shared";

const TAG_TO_KIND: Record<GlorbitTag, MessageKind> = {
  SUMMARY: "summary",
  DECISION: "decision",
  BLOCKER: "blocker",
  QUESTION: "question",
  ARTIFACT: "artifact",
  DONE: "done",
  STATUS: "status",
};

const TAG_RE = new RegExp(`^(${GLORBIT_TAGS.join("|")}):\\s?(.*)$`);

export interface TagMatch {
  tag: GlorbitTag;
  kind: MessageKind;
  body: string;
}

export function matchTag(line: string): TagMatch | null {
  const m = line.match(TAG_RE);
  if (!m) return null;
  const tag = m[1] as GlorbitTag;
  return {
    tag,
    kind: TAG_TO_KIND[tag],
    body: (m[2] ?? "").trimEnd(),
  };
}

export class TagStreamer {
  private pending: TagMatch | null = null;
  private extraLines: string[] = [];

  push(line: string): TagMatch | null {
    const trimmed = line.trimEnd();
    const tag = matchTag(trimmed);

    if (tag) {
      const flushed = this.flush();
      this.pending = tag;
      this.extraLines = [];
      return flushed;
    }

    if (this.pending) {
      if (trimmed === "") {
        const flushed = this.flush();
        return flushed;
      }
      if (/^\s/.test(line)) {
        this.extraLines.push(trimmed);
        return null;
      }
      return this.flush();
    }

    return null;
  }

  flush(): TagMatch | null {
    if (!this.pending) return null;
    const { tag, kind, body } = this.pending;
    const combined =
      this.extraLines.length > 0
        ? [body, ...this.extraLines].filter((s) => s.length > 0).join(" ")
        : body;
    this.pending = null;
    this.extraLines = [];
    return { tag, kind, body: combined };
  }
}
