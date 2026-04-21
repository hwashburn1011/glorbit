"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useGlorbit } from "@/lib/provider";
import { ChatHeader } from "./ChatHeader";
import { FilterStrip, type ChipKind } from "./FilterStrip";
import { Timeline } from "./Timeline";
import { Composer } from "./Composer";
import { TerminalView } from "./TerminalView";
import { KillAllModal } from "./KillAllModal";

export function ChatPane() {
  const { store, refreshMessages } = useGlorbit();
  const selection = useStore(store, (s) => s.selection);
  const agents = useStore(store, (s) => s.agents);
  const [tab, setTab] = useState<"chat" | "terminal" | "files">("chat");
  const [kindFilter, setKindFilter] = useState<ChipKind>("everything");
  const [rawNoise, setRawNoise] = useState(false);
  const [killOpen, setKillOpen] = useState(false);

  useEffect(() => {
    void refreshMessages(selection);
    setTab("chat");
    if (selection.kind === "view" && selection.view === "needs") {
      store.optimisticMarkNeedsRead();
      void api
        .markRead({ view: "needs", upTo: Date.now() })
        .catch((err) => console.warn("mark-read failed", err));
    }
  }, [selection, refreshMessages, store]);

  const selectedAgent =
    selection.kind === "agent" ? agents.find((a) => a.handle === selection.handle) ?? null : null;

  return (
    <main className="[grid-area:chat] grid grid-rows-[auto_auto_1fr_auto] min-h-0">
      <ChatHeader
        activeTab={tab}
        onTabChange={(t) => {
          if (t === "terminal" && !selectedAgent) return;
          setTab(t);
        }}
        onKillAll={() => setKillOpen(true)}
      />
      {tab === "chat" && (
        <FilterStrip
          kindFilter={kindFilter}
          onKindChange={setKindFilter}
          rawNoise={rawNoise}
          onRawNoiseChange={setRawNoise}
        />
      )}
      {tab === "chat" ? (
        <Timeline kindFilter={kindFilter} rawNoise={rawNoise} />
      ) : tab === "terminal" && selectedAgent ? (
        <TerminalView agentId={selectedAgent.id} />
      ) : (
        <div className="flex items-center justify-center text-text-fade text-[12px] italic">
          files tab is stubbed in v1
        </div>
      )}
      <Composer />
      <KillAllModal
        open={killOpen}
        onClose={() => setKillOpen(false)}
        count={agents.filter((a) => a.status !== "idle" && a.status !== "done").length}
      />
    </main>
  );
}
