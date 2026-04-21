"use client";

import type { MessageKind } from "@/lib/shared";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

export type ChipKind = "everything" | MessageKind;

const CHIPS: Array<{ id: ChipKind; label: string; color?: string }> = [
  { id: "everything", label: "everything" },
  { id: "decision", label: "decisions", color: "text-accent" },
  { id: "blocker", label: "blockers", color: "text-kind-red" },
  { id: "question", label: "questions", color: "text-kind-violet" },
  { id: "artifact", label: "artifacts", color: "text-kind-blue" },
  { id: "done", label: "done", color: "text-kind-green" },
];

interface FilterStripProps {
  kindFilter: ChipKind;
  onKindChange: (k: ChipKind) => void;
  rawNoise: boolean;
  onRawNoiseChange: (v: boolean) => void;
}

export function FilterStrip({ kindFilter, onKindChange, rawNoise, onRawNoiseChange }: FilterStripProps) {
  const { store } = useGlorbit();
  const messages = useStore(store, (s) => s.messages);

  const counts: Record<ChipKind, number> = {
    everything: messages.length,
    summary: 0,
    decision: 0,
    blocker: 0,
    question: 0,
    artifact: 0,
    done: 0,
    status: 0,
    instruction: 0,
    note: 0,
  };
  for (const m of messages) {
    counts[m.kind as ChipKind] = (counts[m.kind as ChipKind] ?? 0) + 1;
  }

  return (
    <div className="px-5 py-2 border-b border-border flex items-center gap-1.5">
      {CHIPS.map((chip) => {
        const active = kindFilter === chip.id;
        const count = chip.id === "everything" ? counts.everything : counts[chip.id];
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onKindChange(chip.id)}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wide18 rounded-xs border transition-colors ${
              active
                ? "border-accent text-accent bg-bg-hover"
                : `border-border text-text-dim hover:border-border-hot hover:text-text ${chip.color ?? ""}`
            }`}
          >
            {chip.label}
            {count > 0 && <span className="ml-1.5 text-text-fade">({count})</span>}
          </button>
        );
      })}
      <div className="flex-1" />
      <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide18 text-text-dim cursor-pointer select-none">
        <span>raw terminal noise</span>
        <span
          className={`w-7 h-3.5 rounded-full transition-colors relative ${rawNoise ? "bg-accent" : "bg-border-hot"}`}
          onClick={() => onRawNoiseChange(!rawNoise)}
        >
          <span
            className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-bg transition-transform ${rawNoise ? "translate-x-[14px]" : "translate-x-0.5"}`}
          />
        </span>
      </label>
    </div>
  );
}
