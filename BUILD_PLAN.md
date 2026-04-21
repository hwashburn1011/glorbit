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
- [x] 3.5 sessions repo (startForAgent, end, updateStats)
- [x] 3.6 messages repo (insert, list w/ filters + pagination, markRead, pin/unpin, pinned list)
- [x] 3.7 ops repo (insert, listByWindow)
- [x] 3.8 db barrel (`createDb(config)` returning repos + close)

## Epic 4 — pty manager

Branch: `epic/04-pty`

- [x] 4.1 pty wrapper: spawn with node-pty, write, kill, onData, onExit, resize, interrupt
- [x] 4.2 pty registry (agentId → handle) + session lifecycle + event fan-out
- [x] 4.3 transcript writer with debounced flush (2s / 8KB)
- [x] 4.4 secret scrubber module + patterns
- [x] 4.5 line buffer (handle partial lines across chunks) + ANSI strip

## Epic 5 — message parsing

Branch: `epic/05-parsers`

- [x] 5.1 tag parser (SUMMARY/DECISION/BLOCKER/QUESTION/ARTIFACT/DONE/STATUS) column-0 prefix + TagStreamer for indented continuations
- [x] 5.2 mention extraction (`@handle` tokens) + broadcast detection
- [x] 5.3 generic provider parser (shell-prompt verb classifier)
- [x] 5.4 claude-code parser (tool-use markers, thinking/diff/speaker lines + generic fallback)
- [x] 5.5 parser registry with per-provider selection (generic fallback)
- [x] 5.6 status transitions on kind (blocker→blocked, done→done, question→waiting, artifact→needs-review)
- [x] 5.7 pipeline: pty.data → tag streamer → provider parser → db + emit.message/op + status patch

## Epic 6 — HTTP API

Branch: `epic/06-http-api`

- [x] 6.1 agents routes (GET list, POST create+spawn, PATCH, DELETE kill+remove)
- [x] 6.2 messages routes (GET with view/agent/kind/before/limit + unread counts)
- [x] 6.3 ops routes (GET by session window)
- [x] 6.4 `/api/send` composer endpoint (single, broadcast, note-to-self)
- [x] 6.5 interrupt + kill + kill-all endpoints
- [x] 6.6 pin + unpin + mark-read (ids or view=needs) endpoints
- [x] 6.7 compose app: db + pty + bus + pipeline + all routes registered in index.ts

## Epic 7 — WebSocket transport

Branch: `epic/07-ws`

- [x] 7.1 `@fastify/websocket` plugin registered
- [x] 7.2 `/ws/room` subscribe; forwards RoomEventBus events; ping/pong keepalive
- [x] 7.3 `/ws/session/:agentId` raw pty stream (pty.raw → JSON frame; closes on pty.exit)
- [x] 7.4 RoomEventBus module (server-internal pub/sub — shipped with epic 6.0)

## Epic 8 — periodic summary job

Branch: `epic/08-summary-job`

- [x] 8.1 SummaryScheduler with configurable cadence
- [x] 8.2 skip-if-recent-tagged-message (2 min window)
- [x] 8.3 wire SummaryScheduler into server bootstrap (start on listen, stop on shutdown)

## Epic 9 — seed mode

Branch: `epic/09-seed`

- [x] 9.1 `--seed` flag parsing (already in config.loadConfig)
- [x] 9.2 fake agent simulator — 4 scripted personas (athena/kestrel/orion/nova) emit realistic tags + ops in a loop

## Epic 10 — frontend scaffold

Branch: `epic/10-web-scaffold`

- [x] 10.1 `apps/web` Next.js 14 App Router + TS (package.json, tsconfig, next.config, api+ws rewrites)
- [x] 10.2 Tailwind + postcss; token theme (bg, accent, kinds, mono/serif fonts, pulse/slide-in animations)
- [x] 10.3 globals.css: fonts, CRT scanlines (::after), radial ambient glow (::before), dim scrollbars
- [x] 10.4 root layout with grid areas (topbar/sidebar/chat) + placeholder page with branded topbar
- [x] 10.5 re-export shared types through `src/lib/shared.ts` for consistent import path

## Epic 11 — frontend data layer

Branch: `epic/11-web-data`

- [x] 11.1 RoomSocket (reconnecting WS client w/ exponential backoff + 25s ping keepalive)
- [x] 11.2 fetch client (typed API surface for every /api endpoint)
- [x] 11.3-11.6 GlorbitStore: agents + messages + counts + selection, applies RoomEvents, useSyncExternalStore hook
- [x] 11.7 GlorbitProvider — hydrates on mount, connects RoomSocket, exposes refreshMessages

## Epic 12 — topbar

Branch: `epic/12-topbar`

- [x] 12.1 brand block + pulsing accent dot
- [x] 12.2 stat pills (running/blocked/waiting/done derived from agents list)
- [x] 12.3 search stub (disabled input)
- [x] 12.4 live clock (1 Hz update)

## Epic 13 — sidebar

Branch: `epic/13-sidebar`

- [x] 13.1 Views section (all/needs/done/pinned, badges from counts)
- [x] 13.2 Agents section with colored avatar, status dot, repo label, provider tag, unread count
- [x] 13.3 active row styling (accent left-border, bg-hover tint, accent text)
- [x] 13.4 Attach terminal button (calls onAttach; modal lands in epic 17)

## Epic 14 — chat header + filter strip

Branch: `epic/14-chat-header`

- [x] 14.1 ChatHeader with view-aware / agent-aware titles and subtitles
- [x] 14.2 tool buttons (chat / terminal / files stub / kill-all with danger state)
- [x] 14.3 FilterStrip kind chips with live counts
- [x] 14.4 raw-noise toggle (controlled switch)

## Epic 15 — timeline

Branch: `epic/15-timeline`

- [x] 15.1 MessageRow with avatar, name, repo, kind tag, time
- [x] 15.2 KIND_STYLE palette (each MessageKind → border + text tone)
- [x] 15.3 OpsCollapse row (↑ N ops · agent · click to expand)
- [x] 15.4 Ops expand fetches /api/ops for the window
- [x] 15.5 ArtifactCard with diff/test summary
- [x] 15.6 2-minute grouping stack (hide avatar/header when grouped)
- [x] 15.7 day separator
- [x] 15.8 animate-slide-in on message rows

## Epic 16 — composer

Branch: `epic/16-composer`

- [x] 16.1 multi-line textarea with Cmd+Enter send, Esc clear
- [x] 16.2 @ mention autocomplete (substring match, arrow keys, Tab/Enter insert)
- [x] 16.3 RoutingPreview (note / single / multi / broadcast) live-updating
- [x] 16.4 /broadcast slash command mapped to targets ["*"] (other slashes land in epic 19)
- [x] 16.5 agent-view auto-prefill `@handle ` when selection switches

## Epic 17 — modals

Branch: `epic/17-modals`

- [x] 17.0 reusable Modal shell with Escape-to-close
- [x] 17.1 AttachTerminalModal (all spec §6.8 fields incl. color swatches + avatar preview)
- [x] 17.2 client-side validation (handle pattern, absolute path, launch cmd required); server also validates path existence
- [x] 17.3 KillAllModal confirmation with session count

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
