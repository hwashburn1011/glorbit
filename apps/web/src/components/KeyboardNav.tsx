"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function KeyboardNav() {
  const { store } = useGlorbit();
  const agents = useStore(store, (s) => s.agents);
  const selection = useStore(store, (s) => s.selection);
  const chordRef = useRef<{ key: string; ts: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      if (chordRef.current && Date.now() - chordRef.current.ts < 1200) {
        const first = chordRef.current.key;
        chordRef.current = null;
        if (first === "g") {
          if (e.key === "a") {
            e.preventDefault();
            store.setSelection({ kind: "view", view: "all" });
            return;
          }
          if (e.key === "n") {
            e.preventDefault();
            store.setSelection({ kind: "view", view: "needs" });
            return;
          }
          if (e.key === "d") {
            e.preventDefault();
            store.setSelection({ kind: "view", view: "done" });
            return;
          }
          if (e.key === "p") {
            e.preventDefault();
            store.setSelection({ kind: "view", view: "pinned" });
            return;
          }
        }
      }

      if (e.key === "g") {
        chordRef.current = { key: "g", ts: Date.now() };
        return;
      }

      if (e.key === "j" || e.key === "k") {
        if (agents.length === 0) return;
        const currentIdx =
          selection.kind === "agent"
            ? agents.findIndex((a) => a.handle === selection.handle)
            : -1;
        const delta = e.key === "j" ? 1 : -1;
        const nextIdx =
          currentIdx < 0
            ? e.key === "j"
              ? 0
              : agents.length - 1
            : (currentIdx + delta + agents.length) % agents.length;
        const next = agents[nextIdx];
        if (next) {
          e.preventDefault();
          store.setSelection({ kind: "agent", handle: next.handle });
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agents, selection, store]);

  return null;
}
