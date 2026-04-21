"use client";

import { useSyncExternalStore } from "react";
import type {
  Agent,
  AgentStatus,
  Message,
  RoomEvent,
  View,
} from "./shared.js";
import type { UnreadCounts } from "./api.js";

export type Selection =
  | { kind: "view"; view: View }
  | { kind: "agent"; handle: string };

interface State {
  agents: Agent[];
  messages: Message[];
  counts: UnreadCounts;
  selection: Selection;
  connected: boolean;
}

const EMPTY_COUNTS: UnreadCounts = {
  all: 0,
  needs: 0,
  doneToday: 0,
  pinned: 0,
  perAgent: {},
};

function initialState(): State {
  return {
    agents: [],
    messages: [],
    counts: EMPTY_COUNTS,
    selection: { kind: "view", view: "all" },
    connected: false,
  };
}

type Listener = () => void;

export class GlorbitStore {
  private state: State = initialState();
  private readonly listeners = new Set<Listener>();

  getState = (): State => this.state;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(next: State): void {
    this.state = next;
    for (const l of this.listeners) l();
  }

  hydrate(agents: Agent[], messages: Message[], counts: UnreadCounts): void {
    this.set({ ...this.state, agents, messages, counts });
  }

  setConnected(connected: boolean): void {
    this.set({ ...this.state, connected });
  }

  setSelection(selection: Selection): void {
    this.set({ ...this.state, selection });
  }

  apply(event: RoomEvent): void {
    switch (event.type) {
      case "agent.added": {
        if (this.state.agents.some((a) => a.id === event.agent.id)) return;
        this.set({ ...this.state, agents: [...this.state.agents, event.agent] });
        return;
      }
      case "agent.removed": {
        const agents = this.state.agents.filter((a) => a.id !== event.agentId);
        this.set({ ...this.state, agents });
        return;
      }
      case "agent.status": {
        const agents = this.state.agents.map((a) =>
          a.id === event.agentId ? { ...a, status: event.status as AgentStatus } : a,
        );
        this.set({ ...this.state, agents });
        return;
      }
      case "agent.stats": {
        const agents = this.state.agents.map((a) =>
          a.id === event.agentId
            ? { ...a, lastActive: event.lastActive }
            : a,
        );
        this.set({ ...this.state, agents });
        return;
      }
      case "message.new": {
        if (this.state.messages.some((m) => m.id === event.message.id)) return;
        const messages = [...this.state.messages, event.message];
        const counts = bumpCountsOnNewMessage(this.state.counts, event.message);
        this.set({ ...this.state, messages, counts });
        return;
      }
      case "op.new": {
        return;
      }
    }
  }
}

function bumpCountsOnNewMessage(counts: UnreadCounts, msg: Message): UnreadCounts {
  if (msg.authorType !== "agent") return counts;
  const perAgent = { ...counts.perAgent };
  if (msg.authorId) {
    perAgent[msg.authorId] = (perAgent[msg.authorId] ?? 0) + 1;
  }
  const needsBump = msg.kind === "blocker" || msg.kind === "question" ? 1 : 0;
  const doneBump = msg.kind === "done" ? 1 : 0;
  return {
    all: counts.all + 1,
    needs: counts.needs + needsBump,
    doneToday: counts.doneToday + doneBump,
    pinned: counts.pinned,
    perAgent,
  };
}

export function useStore<T>(store: GlorbitStore, selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(initialState()),
  );
}
