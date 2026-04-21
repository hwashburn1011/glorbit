# Refinement log

Each pass walks every epic and lists concrete issues to fix. Items are resolved in order in the accompanying epic branch.

## Pass 1 — epic 22

### Epic 1 — foundation
- *nothing actionable; scaffold is minimal and correct*

### Epic 2 — backend scaffold
- **R1** `config.ts` uses `Boolean` coercion loosely for `GLORBIT_ALLOW_NON_LOOPBACK`. Tighten: unknown values fall through to `fallback`, but the current implementation hides invalid values silently. Accept but document.

### Epic 3 — database layer
- **R2** `messages.list()` queries `ORDER BY created_at DESC LIMIT N` then `.reverse()`s in JS for ascending display. Correct but subtle; leave a one-line comment explaining why the round-trip is needed (we want the newest N, displayed oldest-first).

### Epic 4 — pty manager
- **R3** `registry.ts` `ensureState` receives an unused `handle` parameter and has a dead `void handle`. Remove.
- **R4** `PtyRegistryEmitter` interface exported from `registry.ts` is unused.

### Epic 5 — parsers
- **R5** `generic.ts` has a dead `classify()` stub and `void classify` sprinkled through the file. Remove.
- **R6** `pipeline.ts` `writeTag()` accepts `ReturnType<typeof TagStreamer["flush"]>` — technically valid but fragile. Prefer `TagMatch | null` named type.
- **R7** Pipeline's `pty.exit` handler looks up `sessions.liveForAgent(agentId)` AFTER PtyRegistry has already ended the session. The session has `ended_at` set and will not be returned by `liveForAgent`. Last-tag leak. Fix: capture `sessionId` on `pty.data` and use it on exit.

### Epic 6 — HTTP API
- **R8** `agents.ts` POST handler returns 500 after `pty.start` fails but leaves the agent row deleted. Good. But the error emits no `agent.removed`. Not visible to clients because no `agent.added` was emitted either. Correct behavior — no change needed, just verify.

### Epic 7 — WebSocket
- **R9** `room.ts` has `socket.on("message", ...)` but Fastify websocket's socket is a `WebSocket` from `ws`, and it uses `on` with a `message` event. The parameter type annotation `Buffer | ArrayBuffer | string` is overly broad. Tidy.

### Epic 8 — summary job
- **R10** `scheduler.ts` reads the latest message via `messages.list({ agentId, before, limit: 1 })`. That returns sorted ASC with 1 item, so `recent.at(-1)` works, but the intent is cleaner with `recent[0]`. Tidy.

### Epic 9 — seed
- **R11** `simulator.ts` references `agents[idx]` inside `SCRIPTS.map((script, idx) => …)`, which trips `noUncheckedIndexedAccess`. The early `if (!agent) return;` guard is present but a stricter approach is to iterate `agents` directly once per epoch.

### Epic 10 — frontend scaffold
- *nothing actionable*

### Epic 11 — frontend data layer
- **R12** `provider.tsx` `force` useState is unused after `refreshMessages` (the store itself notifies). Remove the dead `force`.
- **R13** `store.ts` `replaceMessages` and `setAgents` and `updateCounts` are declared but never used. Keep only what the provider calls.

### Epic 12 — topbar
- **R14** `Topbar` `SearchStub` input passes `disabled` AND `aria-disabled` AND `cursor-not-allowed`; that's fine. But the `Clock` renders on the server and then hydrates, which produces a mismatch warning because of `new Date()` timing. Wrap the `useEffect` initialization and return `null` on first render.

### Epic 13 — sidebar
- **R15** `Sidebar.AgentRow` context menu: opening a menu on one row and clicking another row doesn't close the first. Acceptable but trivial to fix — click outside listener would be ideal; for now, close menu on any `document` click.

### Epic 14 — chat header + filter
- **R16** `FilterStrip` uses `toggle` as a `span` with `onClick` (clickable non-button). A11y: change to a button.
- **R17** `ChatHeader` return type uses `JSX.Element` locally in variables, but doesn't import `JSX` from React. Modern TS+React has it as a global, but to be explicit we can type variables as `ReactNode`.

### Epic 15 — timeline
- **R18** **Message grouping bug**: `grouped = m.authorType === "agent" && m.authorId === lastAuthorId && …`. But `lastAuthorId` is only reset on day change, not on author-type change. A user message → agent message with same authorId (null) can't group (authorType check guards it), so this is actually fine. But the `lastAgentMessage` capture persists across user messages, meaning a human interjection followed by the same agent still triggers an ops-collapse row. That's desirable. **Still** — reset `lastAgentMessage` when a user message is interleaved, to avoid implying the whole user gap is ops. Fix.
- **R19** `buildRows` never inserts an ops-collapse row *before* the first agent message. Users won't see setup ops on first load; acceptable.

### Epic 16 — composer
- **R20** `MentionPopover` computes position from `useEffect` outside React render — actually it uses `fixed` positioning from a `DOMRect` captured on change. If the textarea resizes, the popover can detach. Trivial — re-capture on keyup.

### Epic 17 — modals
- **R21** `AttachTerminalModal` validation allows a relative path if `repoPath.trim()` exists and doesn't start with `/` or windows drive. Current check correctly rejects because of the `!.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(...)` pattern. But the `startsWith("/")` fires even for path `/etc` — which is valid. Need to also accept Windows with forward slashes and UNC paths. Add UNC.

### Epic 18 — xterm
- **R22** `TerminalView` uses `await import("@xterm/xterm/css/xterm.css")` which doesn't resolve through Next.js's standard CSS pipeline. Use a client-side side-effect import at the top of the file (still "use client"). Fix.

### Epic 19 — polish
- **R23** `Timeline.togglePin` uses `message.pinned` at call time, but because we don't subscribe to pinned state over WS, the UI only updates after the next `listMessages` refresh. Optimistic update into the store would be better. Low priority — leave for pass 2.

### Epic 20 — README
- *nothing actionable*

### Epic 21 — enhancements
- **R24** `KeyboardNav` allows `g` → pending chord to shadow a real `g` keypress. Low impact, won't fix.

## Execution order

R3, R4, R5, R6, R7, R11, R12, R13, R14, R15, R16, R18, R21, R22 get fixed in this pass. The rest (R1, R2, R8, R9, R10, R17, R19, R20, R23, R24) are either no-ops or deferred with reason.
