"use client";

import type { ColorKey, View } from "@/lib/shared";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

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

const VIEW_META: Record<View, { title: string; subtitle: string; icon: string }> = {
  all: { title: "#all agents", subtitle: "unified inbox", icon: "∑" },
  needs: { title: "#needs you", subtitle: "blockers + open questions", icon: "!" },
  done: { title: "#done", subtitle: "completed today", icon: "✓" },
  pinned: { title: "#pinned", subtitle: "pinned messages", icon: "★" },
};

export interface ChatTool {
  id: "chat" | "terminal" | "files" | "kill-all";
  label: string;
  active?: boolean;
  disabled?: boolean;
  intent?: "danger";
  onClick?: () => void;
}

interface ChatHeaderProps {
  activeTab: "chat" | "terminal" | "files";
  onTabChange: (tab: "chat" | "terminal" | "files") => void;
  onKillAll: () => void;
}

export function ChatHeader({ activeTab, onTabChange, onKillAll }: ChatHeaderProps) {
  const { store } = useGlorbit();
  const selection = useStore(store, (s) => s.selection);
  const agents = useStore(store, (s) => s.agents);

  let title: JSX.Element;
  let subtitle: string;
  let agentSelected = false;

  if (selection.kind === "view") {
    const meta = VIEW_META[selection.view];
    title = (
      <span className="font-serif text-[18px] italic text-text">
        <span className="text-accent not-italic font-semibold mr-2">{meta.icon}</span>
        {meta.title}
      </span>
    );
    subtitle = `— ${meta.subtitle} · ${agents.length} session${agents.length === 1 ? "" : "s"}`;
  } else {
    const agent = agents.find((a) => a.handle === selection.handle);
    agentSelected = !!agent;
    if (!agent) {
      title = <span className="font-serif text-[18px] italic text-text">@{selection.handle}</span>;
      subtitle = "— agent not found";
    } else {
      title = (
        <span className="flex items-center gap-2.5">
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-bg ${COLOR_BG[agent.colorKey]}`}
          >
            {agent.avatarText}
          </span>
          <span className="font-serif text-[18px] italic text-text">@{agent.handle}</span>
        </span>
      );
      subtitle = `— ${agent.repoLabel} · ${agent.provider} · ${agent.status}`;
    }
  }

  const tools: ChatTool[] = [
    { id: "chat", label: "chat", active: activeTab === "chat", onClick: () => onTabChange("chat") },
    {
      id: "terminal",
      label: "terminal",
      active: activeTab === "terminal",
      disabled: !agentSelected,
      onClick: () => agentSelected && onTabChange("terminal"),
    },
    {
      id: "files",
      label: "files",
      active: activeTab === "files",
      disabled: true,
    },
    {
      id: "kill-all",
      label: "kill all",
      intent: "danger",
      disabled: agentSelected,
      onClick: onKillAll,
    },
  ];

  return (
    <div className="px-5 py-3 border-b border-border flex items-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">{title}</div>
        <div className="text-[11px] text-text-dim truncate">{subtitle}</div>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.disabled}
            onClick={t.onClick}
            className={`px-3 py-1.5 text-[11px] rounded-xs border transition-colors ${
              t.active
                ? "border-accent text-accent bg-bg-hover"
                : t.intent === "danger"
                  ? "border-border text-kind-red hover:bg-kind-red hover:text-bg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-kind-red"
                  : "border-border text-text-dim hover:border-border-hot hover:text-text disabled:opacity-30 disabled:hover:border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
