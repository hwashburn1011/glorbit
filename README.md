# glorbit

**A unified chat inbox for parallel AI terminal sessions.**

You have 5–15 AI coding terminal sessions running at any given time — a mix of `claude code`, `opencode`, `aider`, and similar CLIs — each working on a **different, independent repository**. Keeping up with all of them means tab-hopping, losing track, missing the moment one finishes or gets blocked.

glorbit is a chat-first viewer layered on top of those already-running terminal sessions. Each session gets a nickname (its "handle") so you can talk to it by name. The chat shows only the signal — decisions, blockers, questions, artifacts, "I'm done" — and hides the ocean of `cat file.ts`, `npm test`, `git diff` noise behind collapsible `↑ N ops` rows.

> glorbit is **not** a multi-agent orchestrator, a terminal launcher, or Slack. Each agent keeps its own private context; `@mention` routes one message into one agent's stdin, and that is the entire coordination surface.

## Install & run

Prerequisites: Node 20+, pnpm 11+, and a platform where [`node-pty`](https://github.com/microsoft/node-pty) builds (macOS/Linux; Windows needs VS Build Tools).

```sh
pnpm install
cp .env.example .env           # optional; defaults are fine on localhost
pnpm dev                       # starts Fastify backend + Next.js frontend
```

Open <http://localhost:3000>.

To explore the UI without attaching real terminals, run the server with fake agents:

```sh
pnpm --filter @glorbit/server seed
# in another shell
pnpm --filter @glorbit/web dev
```

## Attach your first terminal

1. Click `+ attach terminal` at the bottom of the sidebar.
2. Give it a handle (`athena`, `kestrel` — anything matching `^[a-z][a-z0-9-]{1,23}$`).
3. Point it at an absolute repo path.
4. Pick a provider (`claude code`, `opencode`, `aider`, or `custom`) and a launch command. The default cmd is filled in for each provider.
5. Pick a color so you can tell it apart in the list.
6. Hit **attach**. glorbit spawns the pty, writes the glorbit preamble to stdin, and the agent starts responding.

## The tag protocol

glorbit doesn't parse screen output heuristically — agents cooperate by prefixing their first-class messages with a tag at column 0:

| tag          | meaning                                              |
| ------------ | ---------------------------------------------------- |
| `SUMMARY:`   | periodic recap (nudged every 5 min by default)       |
| `DECISION:`  | made a meaningful choice; name the choice            |
| `BLOCKER:`   | stopped, needs human input                           |
| `QUESTION:`  | needs clarification, easy to answer                  |
| `ARTIFACT:`  | produced a shippable thing (PR, branch, file)        |
| `DONE:`      | current task complete                                |
| `STATUS:`    | general progress note (use sparingly)                |

Every other line is collapsed into `↑ N ops` rows you can click to expand. Status transitions are derived from tags: `BLOCKER:` flips the agent to `blocked`, `DONE:` to `done`, `QUESTION:` to `waiting`, etc.

When the human `@mentions` an agent, the message arrives at that pty's stdin prefixed with `[FROM HUMAN]:` so the agent knows to treat it as a priority instruction.

## Keyboard & mouse

- `⌘ + ⏎` / `Ctrl + ⏎` — send composer message
- `Esc` — clear composer / close modal
- `@` in composer — opens fuzzy mention popover (`↑` / `↓` / `Tab` / `⏎` to pick)
- `★` on a message — pin/unpin (right-rail star icon)
- `j` / `k` — move between agents (anywhere outside an input)
- `g a` — jump to `#all agents`; `g n` → `#needs you`; `g d` → `#done`; `g p` → `#pinned`
- right-click an agent row — `interrupt` / `kill` / `restart` menu
- `#needs you` sidebar view — auto-marks entries as read when you open it

Filter strip chips narrow the timeline to a kind. The `raw terminal noise` toggle hides the ops-collapse rows entirely (raw bytes always live in the dedicated terminal tab, never in the chat).

## Where data lives

| what                     | where                                            |
| ------------------------ | ------------------------------------------------ |
| SQLite database          | `~/.glorbit/glorbit.db` (override with `GLORBIT_DATA_DIR`) |
| Raw pty transcripts      | `~/.glorbit/transcripts/{session_id}.log`        |
| Env / ports              | `.env` (see `.env.example`)                      |

## Security posture

- The Fastify server refuses to bind on anything other than `127.0.0.1`/`::1`/`localhost` unless you pass `--i-know-what-im-doing` or set `GLORBIT_ALLOW_NON_LOOPBACK=true`.
- Every pty chunk is run through a secret scrubber before it hits the chat or the db. Known patterns: AWS keys, GitHub tokens, OpenAI/Anthropic keys, GCP API keys, Slack tokens, and `*SECRET*=…` / `*TOKEN*=…` / `*KEY*=…` / `*PASSWORD*=…` env-style assignments. Raw transcripts stay unscrubbed on disk (local-only).
- `kill all` always requires a modal confirm. No agent output ever triggers a spawn or command outside its own pty.

## Known limitations (v1)

- Single-user. No auth. Bind is loopback by design.
- One live session per agent at a time. Relaunch creates a fresh session.
- If the server process dies, all ptys die with it. Re-attach on restart.
- No session resume, no search, no OS notifications, no agent-to-agent chat UI. These are v1.5 — the plumbing (parser, event bus, routing) is already architected to support them.

## Repo layout

```
glorbit/
├── apps/
│   ├── web/           Next.js 14 App Router frontend
│   └── server/        Fastify backend, pty manager, parsers, seed
├── packages/
│   └── shared/        TS types + system-prompt templates
├── glorbit-build-spec.md
├── agent-chatroom-mockup.html
└── BUILD_PLAN.md
```

The spec in `glorbit-build-spec.md` is the authoritative design document. The mockup file is the visual reference. `BUILD_PLAN.md` is the living epic/task log.
