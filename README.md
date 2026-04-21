# glorbit

**A unified chat inbox for parallel AI terminal sessions.**

You have 5–15 AI coding terminal sessions running at any given time — a mix of `claude code`, `opencode`, `aider`, and similar CLIs — each working on a **different, independent repository**. Keeping up with all of them means tab-hopping, losing track, missing the moment one finishes or gets blocked. glorbit is a chat-first viewer layered on top of those already-running terminal sessions. Each session gets a nickname (its "handle") so you can talk to it by name. The chat shows only the signal — decisions, blockers, questions, artifacts, "I'm done" — and hides the ocean of `cat file.ts`, `npm test`, `git diff` noise behind collapsible summaries.

> **Status:** in active development. See [`BUILD_PLAN.md`](./BUILD_PLAN.md) for the epic-by-epic roadmap and [`glorbit-build-spec.md`](./glorbit-build-spec.md) for the authoritative specification.

## Quickstart

```sh
pnpm install
pnpm dev
# then open http://localhost:3000
```

Populate `.env` from `.env.example` if you want to override defaults.

## Monorepo layout

```
glorbit/
├── apps/
│   ├── web/           # Next.js frontend
│   └── server/        # Fastify backend + pty manager
├── packages/
│   └── shared/        # Shared TS types + system-prompt templates
├── .env.example
└── package.json
```

## The tag protocol

Agents running inside glorbit prefix their "first-class" output with one of:

- `SUMMARY:` periodic recap
- `DECISION:` chose something meaningful
- `BLOCKER:` stopped, needs human
- `QUESTION:` needs clarification
- `ARTIFACT:` produced a shippable thing
- `DONE:` task complete
- `STATUS:` general progress note

Everything else is collapsed into `↑ N ops` rows. See the spec for details.

## More docs

Full walkthrough, keyboard shortcuts, data locations, and known limitations land in later epics.
