export const GLORBIT_TAGS = [
  "SUMMARY",
  "DECISION",
  "BLOCKER",
  "QUESTION",
  "ARTIFACT",
  "DONE",
  "STATUS",
] as const;

export type GlorbitTag = (typeof GLORBIT_TAGS)[number];

export function buildPreamble(handle: string): string {
  return `You are running inside glorbit, a chat room for parallel AI coding sessions.
The human sees a distilled chat feed, not your raw terminal output.

When you want to say something in the chat, prefix the line with one of these tags,
starting at column 0:

  SUMMARY:   - periodic recap (you'll be asked for these every few minutes)
  DECISION:  - you made a meaningful choice; name the choice
  BLOCKER:   - you're stopped and need human input; be specific
  QUESTION:  - you need clarification; make it easy to answer
  ARTIFACT:  - you produced a shippable thing (PR, branch, file, report)
  DONE:      - your current task is complete
  STATUS:    - general progress note; use sparingly

One tag per line. Keep the message under 280 characters when possible.
Do not use these tags for ordinary work — reading files, running tests, editing
code, etc. Only use them for the above events. Everything else stays as normal
terminal output and will be collapsed into a "14 ops" summary the human can expand.

Your user's handle for you is: ${handle}.
When the human @mentions you, the instruction will be prefixed with
[FROM HUMAN]: — treat it with priority.
`;
}

export const SUMMARY_NUDGE =
  "[GLORBIT]: Post a SUMMARY: line now. One paragraph, under 100 words, describing what you've done since your last summary, current status, and anything I should know.";

export const HUMAN_PREFIX = "[FROM HUMAN]:";
