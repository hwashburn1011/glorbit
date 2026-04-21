# glorbit

**A unified chat inbox for parallel AI terminal sessions.**

---

## 0. Read this first

### What this is

You have 5–15 AI coding terminal sessions running at any given time — a mix of `claude code`, `opencode`, `aider`, and similar CLIs — each one working on a **different, independent repository**. Not a coordinated team on one mission. Completely separate projects. Billing service in one, marketing site in another, iOS app in another, infra in another.

Keeping up with all of them means tab-hopping through terminal windows, losing track of what each one is doing, missing the moment one of them finishes or gets blocked, and constantly re-establishing context when you switch between them.

**glorbit is a chat-first viewer layered on top of those already-running terminal sessions.** Each session gets a nickname (its "handle") so you can talk to it by name instead of by repo path. The chat shows only the signal — decisions, blockers, questions, artifacts, "I'm done" — and hides the ocean of `cat file.ts`, `npm test`, `git diff` noise behind collapsible summaries. You can click any handle to filter the whole view down to just that one session's chat, or stay in the unified `#all agents` view to skim everything at once.

### What this is NOT

- **Not a mission-control dashboard for coordinated agents.** The sessions don't share a mission. They're unrelated projects.
- **Not a multi-agent orchestrator.** No planner, no router, no "assign this subtask to agent X." The human does the assigning.
- **Not a terminal launcher.** Sessions are already running in real terminals when glorbit attaches to them. glorbit is a viewer and message relay, not a process spawner (though v1.5 may add a "spawn from UI" button as convenience).
- **Not Slack.** No real-time presence, no threads-of-threads, no emoji reactions, no workspaces, no notifications beyond OS-level. It borrows the chatroom metaphor and nothing else.
- **Not a context-sharing layer.** Each agent has its own private context window. Messages posted to glorbit do NOT get injected into every agent's context. `@mention` routes a message into one specific agent's stdin; unaddressed posts are human notes that no agent sees.

### The mental model

Think of it as a **text-message inbox where every contact happens to be a terminal session**. You have threads with each contact (filtered-to-one-agent view), and a unified feed that shows all threads mixed together (`#all agents`). The terminal underneath is just how the "contact" responds to you — like an email protocol, not a feature.

The personas (handles + avatars + colors) exist purely so you can say "@athena run the migration" instead of "the claude-code terminal in /Users/me/repos/billing-service, run the migration." They give identity to what is otherwise an anonymous pty.

---

## 1. Primary user stories

Build to satisfy these, in priority order:

1. **"Which of my 8 agents needs me right now?"** — Open glorbit, see the `#needs you` view, see 3 things that are blocked or have open questions. Everything else fades away.
2. **"What is athena doing?"** — Click `@athena` in the sidebar, see her entire chat history, scroll to the latest, see she asked about the Stripe migration 20 minutes ago.
3. **"Run the migration against staging first."** — Type in the composer while `@athena` is selected (or type `@athena ...` from the unified view), hit send. The instruction lands in athena's terminal stdin. She acknowledges and proceeds.
4. **"I don't care that she read six files and ran jest."** — Raw terminal noise is collapsed into `↑ 14 ops` rows by default. Click to expand if curious.
5. **"kestrel has been silent for 30 minutes — is she still alive?"** — Status dot on the sidebar tells me: running / blocked / waiting / idle / done. If silent-and-running it's probably fine; if silent-and-idle something went wrong.
6. **"Show me everything that finished today."** — `#done` view, across all agents.
7. **"I want to see the actual terminal for this one."** — Click the `terminal` tab in the chat header to swap from distilled chat view to a live xterm view of the underlying pty.

Not prioritized for v1 but architecturally allowed:
- Agent-to-agent messaging (one agent `@mention`ing another). The routing is identical — treat every handle as a destination. Don't block it, but don't build UX for it either.
- Search across all sessions. Stub the search box; make it functional in v1.5.

---

## 2. Tech stack

- **Desktop-first web app.** Single-user, runs locally. Assume it's served on `localhost` and accessed in a browser. No auth in v1.
- **Frontend:** Next.js 14+ (App Router) + React + TypeScript + Tailwind CSS. No component library dependency — use the mockup's raw styling as the starting point.
- **Backend:** Node.js (Fastify preferred over Express for perf/ergonomics). TypeScript.
- **Terminal backend:** [`node-pty`](https://github.com/microsoft/node-pty) for owning pty processes. This is non-negotiable — it's the only reliable way to interact with interactive CLIs like `claude code`.
- **Real-time transport:** Native WebSockets (`ws` package). Two channel types: `/ws/room` for distilled chat events, `/ws/session/:id` for raw pty streams (used when user opens the live terminal view).
- **Database:** SQLite via `better-sqlite3`. Single file at `~/.glorbit/glorbit.db`. No migrations framework needed for v1 — ship a schema init script.
- **Terminal rendering in the UI:** `xterm.js` + `xterm-addon-fit` for the live terminal drilldown view.
- **Process model:** One long-running Node server process. It owns all pty children. If it dies, ptys die with it (v1 limitation; v2 can daemonize).

Monorepo structure:

```
glorbit/
├── apps/
│   ├── web/           # Next.js frontend
│   └── server/        # Fastify backend + pty manager
├── packages/
│   └── shared/        # Shared TS types (Message, Agent, etc.)
├── .env.example
├── README.md
└── package.json       # workspace root
```

Use `pnpm` workspaces.

---

## 3. The core architectural principle

**Each agent has its own private pty session with its own private context. glorbit never mixes contexts between agents.**

This is the single most important rule. Violating it produces token waste, context contamination, and nonsense behavior. Concretely:

- When the user types `@athena run the migration`, that message is written to **only athena's pty stdin**. It does not go to kestrel, orion, or anyone else.
- When the user types an unaddressed message in `#all agents`, that message is saved as a room note and sent to **zero** agents. It's a human jotting something down. The composer should show a clear visual warning when a message has no `@mention` and no `/broadcast` slash command — something like "this is a note to yourself; no agent will see it."
- `@all` and `/broadcast` DO exist for the rare case of "everyone stop" or "I'm going to lunch, finish what you're on." When used, the same short message is dispatched to every active agent's stdin independently. It is not a shared conversation.
- The room timeline shows **distilled events posted by agents** (their prefixed outputs — see §5) but those events are just displayed. They are not re-injected into other agents' contexts.

The UI should make this architecture legible. The composer's routing preview is the main place to reinforce it: as the user types, show "→ athena" or "→ 8 agents (broadcast)" or "→ note to self (no agent)" so they know where their message is going before they hit send.

---

## 4. Data model

Full SQLite schema. All `id` columns are UUIDv7 strings unless noted.

### `agents`

One row per registered handle. A handle is the user-chosen nickname for a terminal session.

```sql
CREATE TABLE agents (
  id            TEXT PRIMARY KEY,
  handle        TEXT NOT NULL UNIQUE,     -- "athena", "kestrel" — user-chosen
  repo_label    TEXT NOT NULL,            -- "billing-service" — display label
  repo_path     TEXT NOT NULL,            -- absolute path, e.g. /Users/me/repos/billing-service
  provider      TEXT NOT NULL,            -- "claude-code" | "opencode" | "aider" | "custom"
  launch_cmd    TEXT NOT NULL,            -- full command glorbit runs to start the pty
  color_key     TEXT NOT NULL,            -- "accent" | "blue" | "violet" | "amber" | "green" | "pink" | "cyan" | "orange"
  avatar_text   TEXT NOT NULL,            -- 2-char initials, e.g. "At", "Ke"
  status        TEXT NOT NULL DEFAULT 'idle', -- "running" | "blocked" | "waiting" | "idle" | "done" | "needs-review" | "error"
  current_task  TEXT,                     -- free-text, what user last told it to do
  created_at    INTEGER NOT NULL,
  last_active   INTEGER                   -- ms since any output
);
```

Status transitions are derived by watching pty output (see §5), but can also be manually overridden by the user from the UI (right-click agent → "mark as done", etc.).

### `sessions`

One row per pty process. An agent can have multiple historical sessions (v2) but for v1, **one live session per agent at a time**. When a session dies, it is marked `ended` and a new one is created if the user relaunches.

```sql
CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  agent_id        TEXT NOT NULL REFERENCES agents(id),
  pid             INTEGER,                -- os pid of the pty child
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  exit_code       INTEGER,
  tokens_used     INTEGER DEFAULT 0,      -- best-effort, parsed from provider output
  cost_usd_cents  INTEGER DEFAULT 0       -- best-effort
);
```

### `messages`

The room timeline. Two kinds of rows live here:

1. Typed events emitted by an agent (parsed from pty output prefixes — see §5)
2. User-authored messages (composer input, whether routed or broadcast)

```sql
CREATE TABLE messages (
  id           TEXT PRIMARY KEY,
  session_id   TEXT REFERENCES sessions(id),  -- null for user messages
  author_type  TEXT NOT NULL,                 -- "agent" | "user" | "system"
  author_id    TEXT,                          -- agent_id if agent; null for user/system
  kind         TEXT NOT NULL,                 -- see §5
  body         TEXT NOT NULL,                 -- the human-readable text shown in the room
  mentions     TEXT NOT NULL DEFAULT '[]',    -- JSON array of agent handles referenced
  metadata     TEXT NOT NULL DEFAULT '{}',    -- JSON; varies by kind (artifact info, etc.)
  created_at   INTEGER NOT NULL,
  read_at      INTEGER                        -- when the user marked it read
);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_author  ON messages(author_type, author_id);
CREATE INDEX idx_messages_kind    ON messages(kind);
```

### `ops`

The collapsed "terminal noise" — every tool invocation / file read / command run that is NOT a first-class message. These are what power the `↑ 14 ops` collapsed rows in the UI.

```sql
CREATE TABLE ops (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  op_type       TEXT NOT NULL,         -- "read" | "write" | "exec" | "edit" | "search" | "other"
  summary       TEXT NOT NULL,         -- one-line human summary, e.g. "read stripe-config.ts"
  raw_excerpt   TEXT,                  -- short excerpt of raw output, for hover/expand
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_ops_session ON ops(session_id, created_at);
```

### `pty_transcripts`

Append-only raw pty output. Not shown in chat view; used when user opens the live terminal view or expands ops.

Stored on disk as files, not in SQLite: one file per session at `~/.glorbit/transcripts/{session_id}.log`. Flush every 2 seconds or 8KB, whichever comes first.

---

## 5. The message parsing protocol (THE critical piece)

This is how glorbit turns raw, noisy pty output into a calm chat room. Get this wrong and the whole product fails.

### The contract

When an agent is first started by glorbit, glorbit prepends an instruction to the agent's first prompt (or writes it as the first line to stdin, before any user task):

```
You are running inside glorbit, a chat room for parallel AI coding sessions.
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

Your user's handle for you is: {HANDLE}.
When the human @mentions you, the instruction will be prefixed with
[FROM HUMAN]: — treat it with priority.
```

(This system prompt lives in `packages/shared/system-prompts/` so it's editable and versioned.)

### The parser

The server watches every pty's stdout line-by-line. For each line:

1. **Check for a tag prefix.** If the line starts with `SUMMARY:`, `DECISION:`, `BLOCKER:`, `QUESTION:`, `ARTIFACT:`, `DONE:`, or `STATUS:` (case-sensitive, column 0), extract it:
   - `kind` = the tag lowercased (e.g. `decision`)
   - `body` = the rest of the line, plus any immediately following lines that are indented or blank-line-continued (keep it simple: until a blank line or another tag)
   - `mentions` = parsed `@handle` tokens from body
   - Insert into `messages` table, broadcast over `/ws/room` WebSocket.
   - Update agent's `status` based on kind: `BLOCKER` → `blocked`, `DONE` → `done`, `QUESTION` → `waiting`, etc.

2. **Otherwise, detect an "op."** Use heuristics to summarize the raw output into an op row:
   - Common patterns to recognize: shell prompt + command (e.g. `$ git diff`), tool-call markers from specific providers (claude code has its own markers, opencode has others), file-edit indicators, test output blocks.
   - For each detected op, insert into `ops` table with a short `summary` string.
   - Emit a lightweight `op_added` event over the WebSocket (the UI uses this to update the `↑ 14 ops` collapsed row in real time).

3. **Otherwise, discard the line for chat purposes** but still append it to the raw transcript file. The live terminal view will read from the transcript.

### Provider-specific heuristics

Each provider emits different noise. Put the parsers in `apps/server/src/parsers/`:

- `claude-code.ts` — knows about claude code's tool-use markers, thinking blocks, file-edit diffs
- `opencode.ts` — knows about opencode's specific output format
- `aider.ts` — similar
- `generic.ts` — fallback; very minimal parsing

Each exports `parseLine(line: string, context: ParserContext): ParsedEvent | ParsedOp | null`.

### Periodic summary prompt

Every N minutes (default 5, configurable per agent), a background job writes to each active agent's stdin:

```
[GLORBIT]: Post a SUMMARY: line now. One paragraph, under 100 words, describing what you've done since your last summary, current status, and anything I should know.
```

The agent responds with a `SUMMARY:` line; the parser catches it normally. This is the mechanism that keeps the room feeling alive when nothing dramatic is happening.

Don't send a summary prompt if the agent has posted any tagged message within the last 2 minutes — they've already said something recent, leave them alone.

---

## 6. UI specification

The mockup file `agent-chatroom-mockup.html` is the reference implementation of the visual design. Match it. Below is the functional spec.

### 6.1 Layout

Two-column grid:

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR: brand · stat pills · search · clock                  │
├──────────────┬───────────────────────────────────────────────┤
│              │ CHAT HEADER: avatar · title · tools           │
│  SIDEBAR     ├───────────────────────────────────────────────┤
│              │ FILTER STRIP: show chips · raw noise toggle   │
│  - views     ├───────────────────────────────────────────────┤
│  - agents    │                                               │
│              │ TIMELINE (scrollable)                         │
│              │                                               │
│              │                                               │
│              ├───────────────────────────────────────────────┤
│              │ COMPOSER                                      │
└──────────────┴───────────────────────────────────────────────┘
```

Sidebar fixed 288px wide. Topbar ~56px tall. Composer ~90px tall. Everything else is the chat.

### 6.2 Sidebar

Two sections: **Views** and **Agents**.

**Views** are saved filters over the unified timeline:

- `∑ all agents` — unified feed, every message from every agent, newest at bottom.
- `! needs you` — only messages where `kind IN ('blocker', 'question')` AND not yet `read_at`.
- `✓ done` — only messages where `kind = 'done'`, any read state, today only.
- `★ pinned` — messages the user has explicitly pinned (right-click → pin). Persist in a `pinned_messages` table or as a flag column; either is fine.

Each view shows an unread count badge. `all agents` count = total unread messages. `needs you` count = unread blockers + questions. `done` count = today's done-messages count (no unread distinction). `pinned` count = total pinned.

**Agents** section lists every registered handle. Each row shows:

- 28px colored avatar square with 2-char initials and a status dot in the bottom-right corner (8 status colors — see §4 `agents.status` column).
- Handle (mono, 13px).
- Repo label (smaller, 10px, uppercase-like dim).
- Right-aligned: provider badge (`cc` for claude code, `oc` for opencode) and unread count.

Clicking a row filters the timeline to only messages where `author_id = this agent`. Visual state: border-left accent stripe, background tint, handle text turns accent-colored.

**Sidebar footer:** one dashed-outline button `+ attach terminal` — opens a modal (see §6.8).

### 6.3 Chat header

Shows context for whatever is currently selected:

- When an inbox view is selected: show the view icon, `#view-name`, and a subtitle (e.g. `— unified inbox · 8 sessions`).
- When an agent is selected: show the agent's avatar, `@handle`, subtitle with repo label, provider name, live status, and session id.

Right side of the header has four tool buttons:

- `chat` (active by default) — shows the distilled chat view described above.
- `terminal` — swaps the main pane to an xterm.js view connected to the selected agent's live pty. Only enabled when a specific agent is selected (grayed out for inbox views). Input in xterm is disabled by default — this is a *viewer* of the pty, not a controller. To send input, use the composer (that way all input is logged as user messages).
- `files` — v1.5, stub for now. Will show files touched in this session.
- `kill all` — red hover state. Confirms via modal, then SIGTERMs all live ptys. Available from inbox views only.

### 6.4 Filter strip

Horizontal row of chips that filter the currently-displayed timeline by message `kind`:

`everything | decisions | blockers | questions | artifacts | done`

Each chip shows a count (e.g. `decisions (3)`). Only one can be active at a time. Default: `everything`.

Right-aligned: a toggle switch labeled `raw terminal noise`. When OFF (default), the `↑ N ops` collapsed rows appear between messages. When ON, every op is rendered as its own row in the timeline with very dim styling. (Raw pty bytes still only appear in the dedicated terminal tab.)

### 6.5 Timeline

Scrollable message list. Each message is a grid row:

```
[avatar]  [name] [repo] [provider-tag] [kind-tag] [time]
          [message body]
          [optional: artifact card]
```

Between message rows, the ops accumulated during that gap render as a **single collapsed noise row**:

```
↑ 14 ops     athena: read stripe-config.ts · ran tests · edited migration.sql · …
```

Click to expand; it inlines all ops as dim mini-rows. Click again to re-collapse.

Grouping rule: consecutive messages from the same agent within 2 minutes should visually stack (hide the avatar + header on the 2nd, 3rd, Nth — like Slack). Use a `.grouped` CSS class.

Day separators (`— today, tuesday apr 20 —`) appear when the local day changes.

Artifact cards are their own element inside a message body, rendered when `kind = 'artifact'` and `metadata` has artifact info. Show icon, name (branch or PR or file), and meta stats (diff counts, test results).

### 6.6 Composer

Bottom of the chat pane. Multi-line textarea with:

- `@` triggers an autocomplete popover of all agent handles. Fuzzy match. Arrow keys + enter to select.
- Slash commands: `/broadcast <msg>` (same as `@all <msg>`), `/kill @agent`, `/retask @agent <new task>`, `/pin` (pins the last message), `/clear` (clears own composer).
- Cmd+Enter (or Ctrl+Enter) sends.
- Esc clears.
- **Routing preview line** below the textarea, live-updating as the user types:
  - No mention, no slash → `→ note to self · no agent will see this` (text-fade color, italic)
  - `@athena` → `→ athena · will be injected into her terminal` (accent color)
  - `@athena @kestrel` → `→ athena, kestrel · 2 separate dispatches` (accent)
  - `/broadcast` or `@all` → `→ 8 agents · broadcast` (amber warning color)

When inside an agent-filtered view, the composer auto-prefills `@handle ` and focuses past it — so you just type the message.

### 6.7 Topbar

- Brand block: `glorbit` wordmark with pulsing accent dot.
- Stat pills: live counts of agents by status (`3 running`, `1 blocked`, `2 waiting`, `2 done`). Update in real time.
- Search input: v1.5 feature, stubbed. Leave the input visible; don't wire it up.
- Clock: current time, updates every second.

### 6.8 Attach terminal modal

Triggered by the sidebar footer button. Fields:

- **Handle** (required, text, validates as `^[a-z][a-z0-9-]{1,23}$`, must be unique)
- **Repo label** (required, display string)
- **Repo path** (required, absolute path, existence-checked)
- **Provider** (required, dropdown: `claude code`, `opencode`, `aider`, `custom`)
- **Launch command** (required, text — pre-filled based on provider choice; e.g. `claude-code` or `opencode` or `aider`; user can edit)
- **Color** (swatch picker, 8 preset colors matching the mockup)
- **Avatar initials** (auto-derived from first 2 chars of handle; editable)

On submit: insert into `agents`, spawn a `node-pty` child with `launch_cmd` running in `repo_path`, create a `sessions` row, send the glorbit system-prompt preamble to stdin, redirect the UI to the new agent's filtered chat.

---

## 7. Backend surface

### 7.1 HTTP (Fastify) — all at `/api/*`

REST-ish, JSON everywhere.

- `GET  /api/agents` — list all agents with latest status
- `POST /api/agents` — create + spawn (body matches the attach modal)
- `PATCH /api/agents/:id` — update status, current_task, color, etc.
- `DELETE /api/agents/:id` — kill pty + delete (asks for confirmation in UI)

- `GET  /api/messages?view=all|needs|done|pinned&agent=<handle>&kind=<kind>&before=<ts>&limit=50` — paginated timeline fetch. Server applies the view filters. Return messages + interleaved `ops_summary` markers (each marker = the collapsed-row entry, with a list of op ids).

- `GET  /api/ops?session=<id>&after=<ts>&before=<ts>` — fetch raw ops for an expanded noise row.

- `POST /api/send` — the composer endpoint. Body:
  ```
  {
    "text": "run the migration against staging first",
    "targets": ["athena"],         // parsed from @mentions, or ["*"] for broadcast, or [] for note-to-self
    "kind": "instruction"
  }
  ```
  Server: (a) writes `[FROM HUMAN]: <text>\n` to each target's pty stdin, (b) creates a `messages` row with `author_type = 'user'`.

- `POST /api/agents/:id/interrupt` — sends SIGINT to the pty.

- `POST /api/agents/:id/kill` — SIGTERM, then SIGKILL after 5s.

- `POST /api/messages/:id/pin` / `DELETE /api/messages/:id/pin`

- `POST /api/messages/mark-read` — body: `{ ids: [...] }` or `{ view: "needs", upTo: <ts> }`.

### 7.2 WebSockets

Two channels:

**`/ws/room`** — the chat event bus. Server pushes:
- `message.new` — a new typed message landed in the timeline
- `op.new` — a new op recorded (UI updates the collapsed noise row counter)
- `agent.status` — an agent's status changed
- `agent.stats` — token / cost / runtime updated
- `agent.added` / `agent.removed`

Client can send:
- `ping` — keepalive

**`/ws/session/:agentId`** — the live pty stream. Server pushes raw bytes as they come off the pty. Client renders in xterm. Read-only in v1 (input goes through `/api/send`).

---

## 8. v1 scope — what ships

Build exactly this. Resist adding more.

1. Attach terminal modal → working end-to-end: creates agent, spawns pty, prompt preamble, first output streams back.
2. Sidebar: Views (all agents / needs you / done / pinned) + Agents list with live status dots and unread counts.
3. Chat header with tool buttons (chat / terminal / files / kill all — files is stubbed).
4. Filter strip with all 6 kind chips + raw-noise toggle.
5. Timeline:
   - Typed messages render with proper kind tags and styling
   - Ops collapse into `↑ N ops` rows between messages
   - Grouping within 2-minute windows
   - Day separators
   - Artifact cards
6. Composer with `@` autocomplete, live routing preview, Cmd+Enter send.
7. Parser for claude code provider (most common); generic fallback for others. opencode parser is a stretch goal.
8. Periodic summary prompt job.
9. Live terminal view (xterm) for a single agent.
10. Interrupt + kill per agent. Kill all.
11. Pin / unpin messages.
12. Mark-read behavior that powers unread counts.

Mock data mode: a `--seed` flag on the server spins up 4 fake agents that emit realistic tagged messages on a timer. This lets frontend development happen without needing real CLIs attached. Ship this — it's how the mockup came to life.

### v1.5+ (not now, but architected for)

- Agent-to-agent `@mention` (agent emits `@kestrel ...` in a tag line → route into kestrel's stdin)
- Search
- Files tab
- Session resume on server restart
- Notifications (OS-level, "kestrel is blocked")
- Multi-user / team mode

---

## 9. Security and safety

Single-user local-first app, but still:

- **Never expose the server on `0.0.0.0`.** Bind to `127.0.0.1` only. Refuse to start if `HOST` env var is set to anything non-loopback unless `--i-know-what-im-doing` flag is passed.
- **Secret scrubbing.** Before any pty output gets into `messages.body` or `ops.summary`, run it through a scrubber that masks common secret patterns: AWS keys, GitHub tokens, OpenAI/Anthropic keys, `.env`-style `KEY=value` lines where the key name looks secret-ish (`*SECRET*`, `*TOKEN*`, `*KEY*`, `*PASSWORD*`). The raw transcript file can keep the unscrubbed version (it's local to disk anyway) but chat view must be scrubbed.
- **Kill-all confirmation.** Never fire `kill all` without a modal confirm.
- **No auto-execute of agent instructions.** Messages from the user flow to agents; messages from agents to the user are display-only. There is no code path where an agent's output causes another process to be spawned or a command to be run outside its own pty.

---

## 10. Acceptance criteria

A reviewer should be able to:

1. Clone the repo, run `pnpm install && pnpm dev`, open `localhost:3000`, and see the glorbit UI.
2. Hit `+ attach terminal` and register a new agent backed by `bash` (as a stand-in for a real CLI). See the agent appear in the sidebar with a live status dot.
3. In the bash session, echo `DECISION: going with option B` — see it appear in the timeline as a decision-tagged message within 1 second.
4. Echo `cat /etc/hosts` output (many lines, unstructured) — see it collapsed as a `↑ N ops` row, NOT as separate messages.
5. Click the `↑ N ops` row and see the raw output expand inline.
6. Type `@<handle> run ls -la` in the composer, send, and see the command execute in that agent's pty (via xterm drilldown).
7. Type a message with no `@mention`, see the composer warn "note to self · no agent will see this," send it anyway, see it in the timeline without any pty side effects.
8. Echo `BLOCKER: need input on X` from the bash session, see the agent's sidebar row turn red, see the message appear in `#needs you`, see the sidebar unread badge increment.
9. Click `#done` view and see only `DONE:` messages.
10. Hit interrupt on the agent — the pty receives SIGINT and any blocking command halts.
11. Restart the server — agents are marked as `ended`, chat history persists, re-attaching creates a fresh session.

---

## 11. Design tone

Match the mockup.

- **Dense but calm.** Near-black (`#0b0d0c`) background. No bright whites. Text at `#d7dcd6`.
- **Single sharp accent:** chartreuse `#d4ff3a`. Used for: the user's own name, active nav states, the `running` status dot, send button, key glyphs. Do not reach for other accents casually.
- **Color is semantic, not decorative.** Red = blocked/error. Amber = waiting/summary. Violet = question/needs-review. Blue = artifact. Green = done. Cyan = opencode. Chartreuse = claude code and user/active. Other avatar colors (pink, orange) exist only to distinguish agent identities visually; they don't carry meaning.
- **Typography.** JetBrains Mono for 95% of text — this is a terminal-adjacent tool and it should feel that way. Fraunces (serif, italic) for two places only: the brand wordmark and the chat title. The serif is a deliberate visual pause that says "this is the human-readable frame around the mechanical content."
- **No emoji. No gradient fills except the faint radial ambient glow in the background. No rounded-corner softness — 2–5px radii throughout, sharp edges preferred.** A subtle horizontal scanline overlay is already applied globally for CRT feel; keep it.
- **Motion is subtle.** Status dot for `running` pulses. New messages fade-slide in (4px, 300ms). Nothing bounces.

---

## 12. README requirements

Ship a `README.md` that covers:

- What glorbit is (one paragraph, cribbable from §0 of this doc)
- Install / run (pnpm install, pnpm dev, open localhost)
- How to attach your first terminal (quick walkthrough with claude code)
- The tag protocol (SUMMARY / DECISION / etc. with examples)
- Keyboard shortcuts
- Where data lives (`~/.glorbit/`)
- Known limitations in v1 (single-user, localhost, no session resume)

---

## Final note to the builder

The core value of glorbit is **separation of signal from noise across parallel independent sessions**. Everything in this spec serves that. When you hit a design decision not covered here, ask: *does this help me see, at a glance, which of my agents needs attention and what they just said?* If yes, do it. If it's adding coordination-between-agents complexity, or making the chat feel more social, or building orchestration logic, stop — that's v2 or never.

Build the calm viewer. The terminals will do the work.
