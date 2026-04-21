import type { OpType } from "@glorbit/shared";
import type { TagMatch } from "./tags.js";

export interface ParserContext {
  handle: string;
}

export interface ParsedOp {
  kind: "op";
  opType: OpType;
  summary: string;
  rawExcerpt?: string;
}

export interface ParsedTag {
  kind: "tag";
  match: TagMatch;
}

export type ParsedLine = ParsedTag | ParsedOp | null;

export interface ProviderParser {
  name: string;
  parseLine(line: string, ctx: ParserContext): ParsedLine;
}
