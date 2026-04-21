# glorbit — build plan

Living document. Each /loop iteration: find the next `[ ]` task, execute it, commit with message `epic NN.M: <task-name>`, flip its box to `[x]`, commit the plan update as part of the same commit, and continue. When an epic's tasks are all `[x]`: push branch, open PR to `main`, merge (squash + delete branch), `git checkout main && git pull`, create the next epic branch, repeat.

Branch naming: `epic/NN-slug` (e.g. `epic/01-foundation`).
Commit convention: `epic NN.M: short-imperative`.

## Conventions

- Each task = one logical commit. Tasks are sized so a commit is meaningful on its own.
- Keep PRs tight: an epic's scope is in its title, tasks are the diff.
- Do NOT stray from the spec in `glorbit-build-spec.md`. Mockup `agent-chatroom-mockup.html` is the visual reference.
- TypeScript strict mode everywhere. Explicit types on exported surfaces.
- No comments unless the WHY is non-obvious.

## Status legend

- `[ ]` not started
- `[~]` in progress (only one task should be `[~]` at a time)
- `[x]` done

## Epic 0 — plan bootstrapped

- [x] 0.1 write BUILD_PLAN.md on main (this commit)

## Epic 1 — foundation

Branch: `epic/01-foundation`

- [x] 1.1 root `package.json` with pnpm workspaces + meta scripts
- [x] 1.2 `pnpm-workspace.yaml` + `.npmrc`
- [x] 1.3 `tsconfig.base.json` (strict, moduleResolution bundler)
- [x] 1.4 root ESLint + Prettier config
- [x] 1.5 `.gitignore` (node_modules, dist, .next, .glorbit data dir, .env)
- [x] 1.6 `.env.example` (PORT, HOST, GLORBIT_DATA_DIR)
- [x] 1.7 `packages/shared` package.json + tsconfig
- [x] 1.8 shared types: `Agent`, `Session`, `Message`, `Op`, `MessageKind`, `AgentStatus`, `Provider`, `ColorKey`
- [x] 1.9 shared WS event types (`RoomEvent` union)
- [x] 1.10 shared system-prompt template at `packages/shared/system-prompts/glorbit-preamble.ts`
- [x] 1.11 README skeleton (title, status, quickstart, link to spec)

## Epic 2 — backend scaffold

Branch: `epic/02-backend-scaffold`

- [x] 2.1 `apps/server` package.json + tsconfig + tsx dev script
- [x] 2.2 Fastify bootstrap `src/index.ts` with graceful shutdown
- [x] 2.3 config loader (env parsing, loopback guard — refuse non-127.0.0.1 unless --i-know-what-im-doing)
- [x] 2.4 logger util (pino)
- [x] 2.5 health route `/api/health`

## Epic 3 — database layer

Branch: `epic/03-db`

- [x] 3.1 better-sqlite3 wiring + data dir creation (`~/.glorbit/`)
- [x] 3.2 schema init (agents, sessions, messages, ops, pinned_messages) idempotent
- [x] 3.3 uuidv7 util
- [x] 3.4 agents repo (list, getById, getByHandle, insert, patch, delete)
- [ ] 3.5 sessions repo (startForAgent, end, updateStats)
- [ ] 3.6 messages repo (insert, list w/ filters + pagination, markRead, pin/unpin, pinned list)
- [ ] 3.7 ops repo (insert, listByWindow, groupedForTimeline)

## Epic 4 — pty manager

Branch: `epic/04-pty`

- [ ] 4.1 pty wrapper: spawn with node-pty, write, kill, onData, onExit
- [ ] 4.2 pty registry (agentId → handle) + lifecycle
- [ ] 4.3 transcript writer with debounced flush (2s / 8KB)
- [ ] 4.4 secret scrubber module + unit-tested patterns
- [ ] 4.5 line buffer (handle partial lines across chunks)

## Epic 5 — message parsing

Branch: `epic/05-parsers`

- [ ] 5.1 tag parser (SUMMARY/DECISION/BLOCKER/QUESTION/ARTIFACT/DONE/STATUS) column-0 prefix
- [ ] 5.2 mention extraction (`@handle` tokens)
- [ ] 5.3 generic provider parser (ops: read/write/exec/edit heuristics)
- [ ] 5.4 claude-code provider parser (tool-use markers, thinking blocks)
- [ ] 5.5 parser registry + per-agent selection
- [ ] 5.6 status transitions on kind (blocker→blocked, done→done, question→waiting)
- [ ] 5.7 wire parser → scrubber → db insert → event emit

## Epic 6 — HTTP API

Branch: `epic/06-http-api`

- [ ] 6.1 agents routes (GET list, POST create+spawn, PATCH, DELETE kill+remove)
- [ ] 6.2 messages routes (GET with view/agent/kind/before/limit)
- [ ] 6.3 ops routes (GET by session window)
- [ ] 6.4 `/api/send` composer endpoint (routing per targets)
- [ ] 6.5 interrupt + kill endpoints
- [ ] 6.6 pin + mark-read endpoints

## Epic 7 — WebSocket transport

Branch: `epic/07-ws`

- [ ] 7.1 `@fastify/websocket` plugin
- [ ] 7.2 `/ws/room` subscribe; emit `message.new`, `op.new`, `agent.status`, `agent.stats`, `agent.added`, `agent.removed`
- [ ] 7.3 `/ws/session/:agentId` raw pty stream
- [ ] 7.4 event bus module (server-internal pub/sub wiring)

## Epic 8 — periodic summary job

Branch: `epic/08-summary-job`

- [ ] 8.1 scheduler timer per active session (configurable, default 5min)
- [ ] 8.2 skip-if-recent-tagged-message (2 min window)
- [ ] 8.3 wire into pty manager lifecycle

## Epic 9 — seed mode

Branch: `epic/09-seed`

- [ ] 9.1 `--seed` flag parsing in server entry
- [ ] 9.2 fake agent simulator (4 agents with realistic tagged output)

## Epic 10 — frontend scaffold

Branch: `epic/10-web-scaffold`

- [ ] 10.1 `apps/web` Next.js 14 App Router + TS
- [ ] 10.2 Tailwind + postcss; token theme (bg, accent, kinds) mapping to mockup vars
- [ ] 10.3 globals.css: fonts (JetBrains Mono, Fraunces), CRT scanlines, radial ambient glow
- [ ] 10.4 root layout (grid: topbar + sidebar + chat)
- [ ] 10.5 import shared types

## Epic 11 — frontend data layer

Branch: `epic/11-web-data`

- [ ] 11.1 WS client hook (/ws/room reconnection)
- [ ] 11.2 fetch client + zod parse
- [ ] 11.3 agents store (list + status updates from WS)
- [ ] 11.4 messages store (view filters + live append)
- [ ] 11.5 selection state (current view or agent)
- [ ] 11.6 unread-count derivations

## Epic 12 — topbar

Branch: `epic/12-topbar`

- [ ] 12.1 brand block + pulsing accent dot
- [ ] 12.2 stat pills (running/blocked/waiting/done counts)
- [ ] 12.3 search stub (non-functional)
- [ ] 12.4 live clock

## Epic 13 — sidebar

Branch: `epic/13-sidebar`

- [ ] 13.1 Views section (all/needs/done/pinned with badges)
- [ ] 13.2 Agents section with avatars, status dots, provider tags, unread counts
- [ ] 13.3 active row styling (border stripe, tint, accent text)
- [ ] 13.4 Attach terminal button (opens modal)

## Epic 14 — chat header + filter strip

Branch: `epic/14-chat-header`

- [ ] 14.1 chat header (view-aware and agent-aware variants)
- [ ] 14.2 tool buttons (chat / terminal / files stub / kill-all)
- [ ] 14.3 filter strip kind chips with counts
- [ ] 14.4 raw-noise toggle

## Epic 15 — timeline

Branch: `epic/15-timeline`

- [ ] 15.1 message row (avatar, name, repo tag, provider tag, kind tag, time)
- [ ] 15.2 kind-tag color palette
- [ ] 15.3 ops collapse row (↑ N ops summary)
- [ ] 15.4 expand/collapse ops
- [ ] 15.5 artifact card
- [ ] 15.6 2-minute grouping stack
- [ ] 15.7 day separator
- [ ] 15.8 fade-slide animation on new messages

## Epic 16 — composer

Branch: `epic/16-composer`

- [ ] 16.1 multi-line textarea w/ Cmd+Enter send, Esc clear
- [ ] 16.2 @ mention autocomplete (fuzzy)
- [ ] 16.3 routing preview line (note-to-self / single / multi / broadcast)
- [ ] 16.4 slash commands (/broadcast, /kill, /retask, /pin, /clear)
- [ ] 16.5 agent-view auto-prefill `@handle `

## Epic 17 — modals

Branch: `epic/17-modals`

- [ ] 17.1 attach terminal modal (fields per spec §6.8)
- [ ] 17.2 client-side validation + server path existence check
- [ ] 17.3 kill-all confirmation modal

## Epic 18 — xterm drilldown

Branch: `epic/18-xterm`

- [ ] 18.1 xterm.js + fit addon dep
- [ ] 18.2 terminal pane connected to `/ws/session/:agentId`
- [ ] 18.3 tool-button switch chat ↔ terminal

## Epic 19 — integration polish

Branch: `epic/19-polish`

- [ ] 19.1 pin wiring end-to-end
- [ ] 19.2 mark-read on view/agent switch
- [ ] 19.3 stat pill live updates via `agent.status`
- [ ] 19.4 interrupt + kill wired to UI

## Epic 20 — README + seed e2e

Branch: `epic/20-readme-e2e`

- [ ] 20.1 final README (what/install/walkthrough/tags/shortcuts/data/limits)
- [ ] 20.2 verify seed produces believable timeline end-to-end

## Epic 21 — enhancement reflection

Branch: `epic/21-enhancements`

- [ ] 21.1 write ENHANCEMENTS.md: candidates aligned with "calm signal viewer"; reject bloat candidates
- [ ] 21.2 implement approved enhancements (scope decided at 21.1)

## Epic 22 — refinement pass 1

Branch: `epic/22-refine-1`

- [ ] 22.1 walk every epic, list refinement items in REFINEMENT_LOG.md
- [ ] 22.2 apply refinements (split into tasks inline as discovered)

## Epic 23 — refinement pass 2

Branch: `epic/23-refine-2`

- [ ] 23.1 second-pass review → REFINEMENT_LOG.md appendix
- [ ] 23.2 apply second-pass refinements

## PR workflow

For each epic, after all tasks `[x]`:

```
git push -u origin epic/NN-slug
gh pr create --title "epic NN — <epic title>" --body "<brief summary of tasks>" --base main
gh pr merge --squash --delete-branch --admin   # --admin bypasses any accidental branch protection
git checkout main && git pull --ff-only
git checkout -b epic/NN+1-slug
```

If `--admin` fails (no admin or no protection), fall back to `gh pr merge --squash --delete-branch`.
