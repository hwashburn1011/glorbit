"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

function Brand() {
  return (
    <div className="font-serif font-semibold text-[18px] tracking-[0.02em] text-accent flex items-center gap-2">
      <span className="w-[10px] h-[10px] rounded-full bg-accent shadow-[0_0_12px_#d4ff3a] animate-pulse" />
      glorbit
      <span className="italic text-text-dim text-[12px] ml-1 font-normal">
        — agent room
      </span>
    </div>
  );
}

function StatPills() {
  const { store } = useGlorbit();
  const agents = useStore(store, (s) => s.agents);
  const counts = useMemo(() => {
    const c = { running: 0, blocked: 0, waiting: 0, done: 0 };
    for (const a of agents) {
      if (a.status === "running") c.running += 1;
      else if (a.status === "blocked" || a.status === "error") c.blocked += 1;
      else if (a.status === "waiting" || a.status === "needs-review") c.waiting += 1;
      else if (a.status === "done") c.done += 1;
    }
    return c;
  }, [agents]);

  const Pill = ({ label, value, tint }: { label: string; value: number; tint: string }) => (
    <div className="flex items-center gap-2 text-xxs text-text-fade uppercase tracking-wide18">
      <strong className={`text-[11px] font-semibold tracking-[0.05em] ${tint}`}>{value}</strong>
      {label}
    </div>
  );

  return (
    <div className="flex items-center gap-5">
      <Pill label="running" value={counts.running} tint="text-accent" />
      <Pill label="blocked" value={counts.blocked} tint="text-kind-red" />
      <Pill label="waiting" value={counts.waiting} tint="text-kind-amber" />
      <Pill label="done" value={counts.done} tint="text-kind-green" />
    </div>
  );
}

function SearchStub() {
  return (
    <input
      type="text"
      placeholder="search all agents · /"
      disabled
      aria-disabled
      className="bg-bg-panel border border-border-hot px-3 py-1.5 rounded-xs text-text-fade text-[11px] w-[220px] outline-none placeholder:text-text-fade cursor-not-allowed"
    />
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <div className="text-[11px] text-text-dim tracking-[0.08em] font-variant-tabular tabular-nums">
      {hh}:{mm}:{ss}
    </div>
  );
}

export function Topbar() {
  return (
    <header className="[grid-area:topbar] border-b border-border bg-gradient-to-b from-[#0f1211] to-bg px-5 py-3 flex items-center gap-5">
      <Brand />
      <div className="flex-1" />
      <StatPills />
      <SearchStub />
      <Clock />
    </header>
  );
}
