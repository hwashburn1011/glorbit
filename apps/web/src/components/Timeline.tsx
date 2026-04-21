"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, ColorKey, Message, MessageKind, Op } from "@/lib/shared";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";
import type { ChipKind } from "./FilterStrip";

async function togglePin(message: Message): Promise<void> {
  try {
    if (message.pinned) await api.unpin(message.id);
    else await api.pin(message.id);
  } catch (err) {
    console.warn("pin toggle failed", err);
  }
}

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

const KIND_STYLE: Record<MessageKind, { label: string; tone: string }> = {
  summary: { label: "SUMMARY", tone: "border-kind-amber text-kind-amber" },
  decision: { label: "DECISION", tone: "border-accent text-accent" },
  blocker: { label: "BLOCKER", tone: "border-kind-red text-kind-red" },
  question: { label: "QUESTION", tone: "border-kind-violet text-kind-violet" },
  artifact: { label: "ARTIFACT", tone: "border-kind-blue text-kind-blue" },
  done: { label: "DONE", tone: "border-kind-green text-kind-green" },
  status: { label: "STATUS", tone: "border-text-fade text-text-dim" },
  instruction: { label: "INSTRUCT", tone: "border-accent text-accent" },
  note: { label: "NOTE", tone: "border-text-fade text-text-dim" },
};

const GROUP_MS = 2 * 60 * 1000;

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDaySeparator(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const base = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return isToday ? `today · ${base.toLowerCase()}` : base.toLowerCase();
}

type ProcessedRow =
  | { type: "day-sep"; id: string; label: string }
  | {
      type: "message";
      id: string;
      message: Message;
      agent: Agent | null;
      grouped: boolean;
    }
  | {
      type: "ops-collapse";
      id: string;
      agent: Agent | null;
      sessionId: string;
      fromTs: number;
      toTs: number;
    };

function buildRows(messages: Message[], agentsById: Map<string, Agent>): ProcessedRow[] {
  const rows: ProcessedRow[] = [];
  let lastDayKey = "";
  let lastAuthorId: string | null = null;
  let lastTs = 0;
  let lastAgentMessage: { agent: Agent | null; ts: number; sessionId: string | null } | null = null;

  for (const m of messages) {
    const d = new Date(m.createdAt);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKey !== lastDayKey) {
      rows.push({
        type: "day-sep",
        id: `day-${dayKey}-${m.id}`,
        label: formatDaySeparator(m.createdAt),
      });
      lastDayKey = dayKey;
      lastAuthorId = null;
    }

    if (
      m.authorType === "agent" &&
      lastAgentMessage &&
      lastAgentMessage.agent?.id === m.authorId &&
      lastAgentMessage.sessionId === m.sessionId &&
      m.createdAt - lastAgentMessage.ts > 1000
    ) {
      rows.push({
        type: "ops-collapse",
        id: `ops-${m.authorId}-${lastAgentMessage.ts}-${m.createdAt}`,
        agent: lastAgentMessage.agent,
        sessionId: lastAgentMessage.sessionId ?? "",
        fromTs: lastAgentMessage.ts,
        toTs: m.createdAt,
      });
    }

    const agent = m.authorId ? agentsById.get(m.authorId) ?? null : null;
    const grouped =
      m.authorType === "agent" &&
      m.authorId === lastAuthorId &&
      m.createdAt - lastTs < GROUP_MS;

    rows.push({ type: "message", id: m.id, message: m, agent, grouped });

    lastAuthorId = m.authorType === "agent" ? m.authorId : null;
    lastTs = m.createdAt;
    if (m.authorType === "agent" && agent && m.sessionId) {
      lastAgentMessage = { agent, ts: m.createdAt, sessionId: m.sessionId };
    }
  }

  return rows;
}

function MessageRow({ message, agent, grouped }: {
  message: Message;
  agent: Agent | null;
  grouped: boolean;
}) {
  const style = KIND_STYLE[message.kind];
  const isUser = message.authorType === "user";
  return (
    <div
      className={`px-5 grid grid-cols-[36px_1fr] gap-3 animate-slide-in ${grouped ? "pt-0.5 pb-1" : "pt-3 pb-1"}`}
    >
      <div className="flex justify-center">
        {!grouped && agent && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-bg ${COLOR_BG[agent.colorKey]}`}
          >
            {agent.avatarText}
          </div>
        )}
        {!grouped && isUser && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-bg bg-accent">
            me
          </div>
        )}
      </div>
      <div className="min-w-0">
        {!grouped && (
          <div className="flex items-center gap-2 mb-1">
            {agent && (
              <>
                <span className="font-mono text-[13px] text-text font-semibold">@{agent.handle}</span>
                <span className="text-[9px] uppercase tracking-widen text-text-fade">
                  {agent.repoLabel}
                </span>
              </>
            )}
            {isUser && (
              <span className="font-mono text-[13px] text-accent font-semibold">@me</span>
            )}
            <span className={`text-[9px] uppercase tracking-wide18 px-1.5 py-px rounded-xs border ${style.tone}`}>
              {style.label}
            </span>
            <span className="text-[10px] text-text-fade ml-auto tabular-nums">
              {formatTime(message.createdAt)}
            </span>
            <button
              type="button"
              onClick={() => void togglePin(message)}
              className={`text-[10px] leading-none px-1 ${message.pinned ? "text-accent" : "text-text-fade hover:text-text-dim"}`}
              aria-label={message.pinned ? "unpin" : "pin"}
              title={message.pinned ? "unpin" : "pin"}
            >
              ★
            </button>
          </div>
        )}
        <div className="text-[13px] text-text whitespace-pre-wrap break-words">
          {message.body}
        </div>
        {message.metadata?.artifact && (
          <ArtifactCard artifact={message.metadata.artifact} />
        )}
      </div>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: NonNullable<Message["metadata"]["artifact"]> }) {
  return (
    <div className="mt-2 border border-kind-blue/40 bg-kind-blue/5 px-3 py-2 rounded-xs flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-widen text-kind-blue">{artifact.kind}</span>
      <span className="text-[12px] text-text font-mono truncate">{artifact.name}</span>
      {artifact.diffAdded !== undefined && (
        <span className="text-[10px] text-kind-green tabular-nums">+{artifact.diffAdded}</span>
      )}
      {artifact.diffRemoved !== undefined && (
        <span className="text-[10px] text-kind-red tabular-nums">-{artifact.diffRemoved}</span>
      )}
      {artifact.testsPassed !== undefined && (
        <span className="text-[10px] text-text-dim tabular-nums">
          {artifact.testsPassed}/{(artifact.testsPassed ?? 0) + (artifact.testsFailed ?? 0)} tests
        </span>
      )}
    </div>
  );
}

function OpsCollapse({
  agent,
  sessionId,
  fromTs,
  toTs,
}: {
  agent: Agent | null;
  sessionId: string;
  fromTs: number;
  toTs: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [ops, setOps] = useState<Op[] | null>(null);

  useEffect(() => {
    if (!expanded || ops !== null || !sessionId) return;
    void (async () => {
      try {
        const res = await api.listOps(sessionId, fromTs, toTs);
        setOps(res.ops);
      } catch (err) {
        console.warn("ops fetch failed", err);
        setOps([]);
      }
    })();
  }, [expanded, ops, sessionId, fromTs, toTs]);

  const approxCount = Math.max(1, Math.round((toTs - fromTs) / 6000));
  return (
    <div className="mx-5 my-1 border-l-2 border-border pl-3 text-[11px] text-text-fade">
      <button
        type="button"
        className="flex items-center gap-2 hover:text-text-dim"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>↑</span>
        <span className="font-semibold text-text-dim tabular-nums">
          {ops?.length ?? approxCount} ops
        </span>
        {agent && <span className="text-text-fade">· {agent.handle}</span>}
        <span className="text-text-fade italic">
          {expanded ? "collapse" : "click to expand"}
        </span>
      </button>
      {expanded && ops && (
        <div className="mt-1 space-y-0.5">
          {ops.length === 0 && <div className="italic text-text-fade">no ops recorded</div>}
          {ops.map((op) => (
            <div key={op.id} className="text-[11px] text-text-dim font-mono">
              <span className="text-text-fade mr-2 uppercase tracking-widen">{op.opType}</span>
              {op.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Timeline({ kindFilter, rawNoise }: { kindFilter: ChipKind; rawNoise: boolean }) {
  const { store } = useGlorbit();
  const messages = useStore(store, (s) => s.messages);
  const agents = useStore(store, (s) => s.agents);
  const selection = useStore(store, (s) => s.selection);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const agentsById = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const visibleMessages = useMemo(() => {
    return messages.filter((m) => {
      if (selection.kind === "agent") {
        const agent = m.authorId ? agentsById.get(m.authorId) : null;
        if (!agent || agent.handle !== selection.handle) return false;
      }
      if (kindFilter !== "everything" && m.kind !== kindFilter) return false;
      return true;
    });
  }, [messages, selection, agentsById, kindFilter]);

  const rows = useMemo(() => buildRows(visibleMessages, agentsById), [visibleMessages, agentsById]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  return (
    <div ref={scrollerRef} className="overflow-y-auto min-h-0">
      {rows.map((row) => {
        if (row.type === "day-sep") {
          return (
            <div
              key={row.id}
              className="my-3 px-5 flex items-center gap-3 text-[9px] uppercase tracking-widen text-text-fade"
            >
              <span className="flex-1 h-px bg-border" />
              <span>— {row.label} —</span>
              <span className="flex-1 h-px bg-border" />
            </div>
          );
        }
        if (row.type === "ops-collapse") {
          if (rawNoise) return null;
          return (
            <OpsCollapse
              key={row.id}
              agent={row.agent}
              sessionId={row.sessionId}
              fromTs={row.fromTs}
              toTs={row.toTs}
            />
          );
        }
        return (
          <MessageRow
            key={row.id}
            message={row.message}
            agent={row.agent}
            grouped={row.grouped}
          />
        );
      })}
    </div>
  );
}
