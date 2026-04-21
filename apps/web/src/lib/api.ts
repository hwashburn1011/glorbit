import type {
  Agent,
  AgentCreateInput,
  Message,
  MessageKind,
  Op,
  SendRequest,
  View,
} from "./shared.js";

export interface UnreadCounts {
  all: number;
  needs: number;
  doneToday: number;
  pinned: number;
  perAgent: Record<string, number>;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).error ?? "";
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async listAgents(): Promise<{ agents: Agent[] }> {
    return jsonFetch("/api/agents");
  },
  async createAgent(input: AgentCreateInput): Promise<{ agent: Agent }> {
    return jsonFetch("/api/agents", { method: "POST", body: JSON.stringify(input) });
  },
  async patchAgent(
    id: string,
    patch: Partial<Pick<Agent, "status" | "currentTask" | "colorKey" | "avatarText">>,
  ): Promise<{ agent: Agent }> {
    return jsonFetch(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  async deleteAgent(id: string): Promise<{ ok: true }> {
    return jsonFetch(`/api/agents/${id}`, { method: "DELETE" });
  },
  async listMessages(params: {
    view?: View;
    agent?: string;
    kind?: MessageKind;
    before?: number;
    limit?: number;
  }): Promise<{ messages: Message[]; counts: UnreadCounts }> {
    const qs = new URLSearchParams();
    if (params.view) qs.set("view", params.view);
    if (params.agent) qs.set("agent", params.agent);
    if (params.kind) qs.set("kind", params.kind);
    if (params.before) qs.set("before", String(params.before));
    if (params.limit) qs.set("limit", String(params.limit));
    return jsonFetch(`/api/messages?${qs.toString()}`);
  },
  async listOps(sessionId: string, after: number, before: number): Promise<{ ops: Op[] }> {
    const qs = new URLSearchParams({
      session: sessionId,
      after: String(after),
      before: String(before),
    });
    return jsonFetch(`/api/ops?${qs.toString()}`);
  },
  async send(body: SendRequest): Promise<{ message: Message; routed: unknown }> {
    return jsonFetch("/api/send", { method: "POST", body: JSON.stringify(body) });
  },
  async interrupt(id: string): Promise<{ ok: true }> {
    return jsonFetch(`/api/agents/${id}/interrupt`, { method: "POST" });
  },
  async kill(id: string): Promise<{ ok: true }> {
    return jsonFetch(`/api/agents/${id}/kill`, { method: "POST" });
  },
  async restart(id: string): Promise<{ ok: true }> {
    return jsonFetch(`/api/agents/${id}/restart`, { method: "POST" });
  },
  async killAll(): Promise<{ ok: true }> {
    return jsonFetch(`/api/kill-all`, { method: "POST" });
  },
  async pin(id: string): Promise<{ ok: true }> {
    return jsonFetch(`/api/messages/${id}/pin`, { method: "POST" });
  },
  async unpin(id: string): Promise<{ ok: true }> {
    return jsonFetch(`/api/messages/${id}/pin`, { method: "DELETE" });
  },
  async markRead(body: { ids?: string[]; view?: "needs"; upTo?: number }): Promise<{ ok: true }> {
    return jsonFetch(`/api/messages/mark-read`, { method: "POST", body: JSON.stringify(body) });
  },
};
