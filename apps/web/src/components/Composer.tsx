"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import type { Agent } from "@/lib/shared";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

const MENTION_RE = /(^|[^A-Za-z0-9_])@([a-z][a-z0-9-]*)$/;

type Routing =
  | { kind: "note" }
  | { kind: "single"; handle: string }
  | { kind: "multi"; handles: string[] }
  | { kind: "broadcast"; count: number };

function parseRouting(text: string, agents: Agent[]): Routing {
  const trimmed = text.trim();
  if (/^\/broadcast\b/i.test(trimmed)) {
    return { kind: "broadcast", count: agents.length };
  }
  if (/(^|\s)@all\b/i.test(trimmed)) {
    return { kind: "broadcast", count: agents.length };
  }
  const handles = new Set<string>();
  for (const match of trimmed.matchAll(/(^|[^A-Za-z0-9_])@([a-z][a-z0-9-]{1,23})/g)) {
    handles.add(match[2]);
  }
  const resolved = [...handles].filter((h) => agents.some((a) => a.handle === h));
  if (resolved.length === 0) return { kind: "note" };
  if (resolved.length === 1) return { kind: "single", handle: resolved[0]! };
  return { kind: "multi", handles: resolved };
}

function RoutingPreview({ routing }: { routing: Routing }) {
  if (routing.kind === "note") {
    return (
      <div className="text-[11px] italic text-text-fade">
        → note to self · no agent will see this
      </div>
    );
  }
  if (routing.kind === "single") {
    return (
      <div className="text-[11px] text-accent">
        → {routing.handle} · will be injected into their terminal
      </div>
    );
  }
  if (routing.kind === "multi") {
    return (
      <div className="text-[11px] text-accent">
        → {routing.handles.join(", ")} · {routing.handles.length} separate dispatches
      </div>
    );
  }
  return (
    <div className="text-[11px] text-kind-amber font-semibold">
      → {routing.count} agents · broadcast
    </div>
  );
}

interface MentionPopoverProps {
  matches: Agent[];
  highlight: number;
  onPick(agent: Agent): void;
  anchor: DOMRect | null;
}

function MentionPopover({ matches, highlight, onPick, anchor }: MentionPopoverProps) {
  if (!anchor || matches.length === 0) return null;
  return (
    <div
      role="listbox"
      className="fixed z-50 bg-bg-elev border border-border-hot rounded-xs shadow-xl min-w-[200px]"
      style={{ left: anchor.left, bottom: window.innerHeight - anchor.top + 4 }}
    >
      {matches.map((agent, idx) => (
        <button
          key={agent.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(agent);
          }}
          className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-[12px] ${
            idx === highlight ? "bg-bg-hover text-accent" : "text-text"
          }`}
        >
          <span className="font-mono">@{agent.handle}</span>
          <span className="text-text-fade text-[10px] truncate">{agent.repoLabel}</span>
        </button>
      ))}
    </div>
  );
}

export function Composer() {
  const { store } = useGlorbit();
  const agents = useStore(store, (s) => s.agents);
  const selection = useStore(store, (s) => s.selection);
  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionRect, setMentionRect] = useState<DOMRect | null>(null);
  const [highlight, setHighlight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selection.kind === "agent") {
      setValue((v) => (v.trim() === "" ? `@${selection.handle} ` : v));
      textareaRef.current?.focus();
    }
  }, [selection]);

  const filteredAgents = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return agents
      .filter((a) => a.handle.includes(q))
      .slice(0, 8);
  }, [agents, mentionQuery]);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValue(next);
      const upToCaret = next.slice(0, e.target.selectionStart ?? next.length);
      const match = upToCaret.match(MENTION_RE);
      if (match) {
        setMentionQuery(match[2]);
        setHighlight(0);
        const rect = e.target.getBoundingClientRect();
        setMentionRect(rect);
      } else {
        setMentionQuery(null);
      }
    },
    [],
  );

  const insertMention = useCallback(
    (agent: Agent) => {
      const el = textareaRef.current;
      if (!el) return;
      const caret = el.selectionStart ?? value.length;
      const before = value.slice(0, caret).replace(MENTION_RE, `$1@${agent.handle} `);
      const after = value.slice(caret);
      const next = before + after;
      setValue(next);
      setMentionQuery(null);
      requestAnimationFrame(() => {
        const pos = before.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [value],
  );

  const routing = useMemo(() => parseRouting(value, agents), [value, agents]);

  const canSend = value.trim().length > 0;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    let text = value.trim();
    let targets: string[] = [];
    if (routing.kind === "note") {
      targets = [];
    } else if (routing.kind === "single") {
      targets = [routing.handle];
    } else if (routing.kind === "multi") {
      targets = routing.handles;
    } else {
      targets = ["*"];
      text = text.replace(/^\/broadcast\s*/i, "").replace(/(^|\s)@all\b/gi, "$1").trim();
    }
    try {
      await api.send({ text, targets });
      setValue("");
    } catch (err) {
      console.error("send failed", err);
    }
  }, [canSend, value, routing]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery !== null && filteredAgents.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight((h) => (h + 1) % filteredAgents.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight((h) => (h - 1 + filteredAgents.length) % filteredAgents.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filteredAgents[highlight]!);
          return;
        }
        if (e.key === "Escape") {
          setMentionQuery(null);
          return;
        }
      }
      if ((e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        void handleSend();
        return;
      }
      if (e.key === "Escape") {
        setValue("");
      }
    },
    [mentionQuery, filteredAgents, highlight, insertMention, handleSend],
  );

  return (
    <div className="border-t border-border p-3 bg-bg-panel">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="type a message · @handle routes to that agent · /broadcast for everyone"
          className="w-full bg-bg-elev border border-border rounded-xs px-3 py-2 text-[13px] text-text placeholder:text-text-fade outline-none focus:border-accent resize-none"
        />
        <MentionPopover
          matches={filteredAgents}
          highlight={highlight}
          onPick={insertMention}
          anchor={mentionRect}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <RoutingPreview routing={routing} />
        <div className="flex-1" />
        <span className="text-[10px] text-text-fade uppercase tracking-wide18">
          ⌘⏎ send · esc clear
        </span>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="bg-accent text-bg px-3 py-1 rounded-xs text-[11px] font-semibold disabled:opacity-40"
        >
          send
        </button>
      </div>
    </div>
  );
}
