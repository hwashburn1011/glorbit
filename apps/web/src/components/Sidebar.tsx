"use client";

import { useMemo, useState } from "react";
import type { Agent, AgentStatus, ColorKey, View } from "@/lib/shared";
import { api } from "@/lib/api";
import { useStore, type Selection } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

type ViewDescriptor = { view: View; icon: string; label: string };

const VIEWS: ViewDescriptor[] = [
  { view: "all", icon: "∑", label: "all agents" },
  { view: "needs", icon: "!", label: "needs you" },
  { view: "done", icon: "✓", label: "done" },
  { view: "pinned", icon: "★", label: "pinned" },
];

const COLOR_BG: Record<ColorKey, string> = {
  accent: "bg-accent",
  blue: "bg-kind-blue",
  violet: "bg-kind-violet",
  amber: "bg-kind-amber",
  green: "bg-kind-green",
  pink: "bg-kind-pink",
  cyan: "bg-kind-cyan",
  orange: "bg-kind-orange",
};

const STATUS_DOT: Record<AgentStatus, string> = {
  running: "bg-accent animate-pulse",
  blocked: "bg-kind-red",
  waiting: "bg-kind-amber",
  idle: "bg-text-fade",
  done: "bg-kind-green",
  "needs-review": "bg-kind-violet",
  error: "bg-kind-red",
};

function rowBadgeClass(active: boolean, muted: boolean) {
  if (muted) return "bg-border-hot text-text-dim";
  if (active) return "bg-accent text-bg";
  return "bg-accent text-bg";
}

function selectionIsView(sel: Selection, view: View): boolean {
  return sel.kind === "view" && sel.view === view;
}

function selectionIsAgent(sel: Selection, handle: string): boolean {
  return sel.kind === "agent" && sel.handle === handle;
}

function InboxRow({
  descriptor,
  count,
  active,
  onClick,
}: {
  descriptor: ViewDescriptor;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`py-2 px-[18px] cursor-pointer flex items-center gap-2.5 border-l-2 transition-colors ${
        active
          ? "bg-bg-hover border-accent"
          : "border-transparent hover:bg-bg-hover"
      }`}
    >
      <span
        className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] font-mono ${
          active
            ? "border border-accent text-accent"
            : "border border-dashed border-text-dim text-text-dim"
        }`}
      >
        {descriptor.icon}
      </span>
      <span className={`flex-1 text-[13px] font-medium ${active ? "text-accent" : "text-text"}`}>
        {descriptor.label}
      </span>
      {count > 0 && (
        <span className={`text-[9px] font-bold px-1.5 py-px rounded-lg ${rowBadgeClass(active, false)}`}>
          {count}
        </span>
      )}
    </div>
  );
}

function AgentRow({ agent, active, unread, onClick }: {
  agent: Agent;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu((v) => !v);
      }}
      className={`py-2 px-[18px] cursor-pointer grid grid-cols-[28px_1fr_auto] gap-2.5 items-center border-l-2 transition-colors relative ${
        active ? "bg-bg-hover border-accent" : "border-transparent hover:bg-bg-hover"
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-bg relative ${COLOR_BG[agent.colorKey]}`}
      >
        {agent.avatarText}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-panel ${STATUS_DOT[agent.status]}`}
        />
      </div>
      <div className="min-w-0">
        <div className={`text-[13px] font-mono truncate ${active ? "text-accent" : "text-text"}`}>
          @{agent.handle}
        </div>
        <div className="text-[10px] uppercase tracking-[0.08em] text-text-fade truncate">
          {agent.repoLabel}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widen text-text-fade">
          {agent.provider === "claude-code" ? "cc" : agent.provider === "opencode" ? "oc" : agent.provider === "aider" ? "ai" : "cu"}
        </span>
        {unread > 0 && (
          <span className="bg-accent text-bg text-[9px] font-bold px-1.5 py-px rounded-lg">
            {unread}
          </span>
        )}
      </div>
      {showMenu && (
        <div
          className="absolute left-4 top-full z-40 bg-bg-elev border border-border-hot rounded-xs text-[11px] min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover text-text"
            onClick={() => {
              void api.interrupt(agent.id);
              setShowMenu(false);
            }}
          >
            interrupt
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover text-kind-red"
            onClick={() => {
              void api.kill(agent.id);
              setShowMenu(false);
            }}
          >
            kill
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover text-text-dim"
            onClick={() => setShowMenu(false)}
          >
            cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onAttach }: { onAttach: () => void }) {
  const { store } = useGlorbit();
  const agents = useStore(store, (s) => s.agents);
  const counts = useStore(store, (s) => s.counts);
  const selection = useStore(store, (s) => s.selection);

  const viewCounts = useMemo<Record<View, number>>(
    () => ({
      all: counts.all,
      needs: counts.needs,
      done: counts.doneToday,
      pinned: counts.pinned,
    }),
    [counts],
  );

  return (
    <aside className="[grid-area:sidebar] border-r border-border bg-bg-panel overflow-y-auto flex flex-col">
      <div className="pt-3.5 pb-1.5 px-[18px] text-[9px] uppercase tracking-widen text-text-fade flex items-center gap-2">
        <span>inbox</span>
        <span className="flex-1 h-px bg-border" />
      </div>
      {VIEWS.map((d) => (
        <InboxRow
          key={d.view}
          descriptor={d}
          count={viewCounts[d.view]}
          active={selectionIsView(selection, d.view)}
          onClick={() => store.setSelection({ kind: "view", view: d.view })}
        />
      ))}

      <div className="pt-3.5 pb-1.5 px-[18px] text-[9px] uppercase tracking-widen text-text-fade flex items-center gap-2">
        <span>agents</span>
        <span className="flex-1 h-px bg-border" />
        <span className="text-accent font-semibold tracking-[0.08em]">{agents.length}</span>
      </div>
      {agents.map((a) => (
        <AgentRow
          key={a.id}
          agent={a}
          active={selectionIsAgent(selection, a.handle)}
          unread={counts.perAgent[a.id] ?? 0}
          onClick={() => store.setSelection({ kind: "agent", handle: a.handle })}
        />
      ))}

      <div className="mt-auto p-3">
        <button
          type="button"
          onClick={onAttach}
          className="w-full border border-dashed border-text-fade text-text-dim hover:border-accent hover:text-accent transition-colors py-2 text-[12px] rounded-xs"
        >
          + attach terminal
        </button>
      </div>
    </aside>
  );
}
