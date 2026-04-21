import type { Provider } from "@glorbit/shared";
import type { ProviderParser } from "./types.js";
import { genericParser } from "./generic.js";
import { claudeCodeParser } from "./claude-code.js";

const REGISTRY: Record<Provider, ProviderParser> = {
  "claude-code": claudeCodeParser,
  opencode: genericParser,
  aider: genericParser,
  custom: genericParser,
};

export function parserFor(provider: Provider): ProviderParser {
  return REGISTRY[provider] ?? genericParser;
}
