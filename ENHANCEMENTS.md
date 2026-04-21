# Enhancement reflection

After the v1 build, I stepped back and asked the question the spec demands: *does this help me see, at a glance, which of my agents needs attention and what they just said?*

I collected candidate enhancements, then filtered them against the core principle: **separation of signal from noise across parallel independent sessions**. Anything adding orchestration, coordination, social features, or cross-agent reasoning is rejected by design — those are v2 or never.

## Approved (ship in this epic)

Each one deepens the signal-vs-noise loop without changing the product shape.

1. **Browser tab title with unread count.** `glorbit · 3 need you` in the title bar so you can alt-tab past the browser tab and still see whether anything's waiting. Zero visual real estate cost, directly improves the top user story.
2. **Agent restart button.** `→ restart` entry on the agent-row context menu so a dead session can be re-spawned without leaving the UI. Supports user story 5 ("kestrel silent — is she still alive?") which currently only exposes kill.
3. **Exact-timestamp tooltip on message time.** Hovering `14:32` shows `Mar 05 · 14:32:17`. Free quality-of-life for the human triaging old events.
4. **Keyboard navigation: `j` / `k` to move between agents, `g a` to jump to all-agents.** Matches the terminal-adjacent identity and lets the power user avoid the mouse when they already know which agent they want.

## Rejected (would bloat the product)

- Agent-to-agent chat UI — spec already defers to v1.5; the routing is architected, no UI needed yet.
- Cross-agent search — v1.5; composer search box stays stubbed.
- Shared context / auto-briefing across agents — violates §3 ("glorbit never mixes contexts between agents").
- Threads, reactions, emoji — explicitly rejected as Slack-creep.
- Ambient AI summarizer of all agents — neat but invents signal where the agents already tag it themselves; net-subtracts trust.
- Workspace / team mode — single-user is a feature, not a limitation.

The four approvals together add ~80 lines; each is testable in isolation and none change the core data model.
