import type { Agent, AgentStatus } from "./agent.js";
import type { Message } from "./message.js";
import type { Op } from "./op.js";

export interface MessageNewEvent {
  type: "message.new";
  message: Message;
}

export interface OpNewEvent {
  type: "op.new";
  op: Op;
  agentHandle: string;
}

export interface AgentStatusEvent {
  type: "agent.status";
  agentId: string;
  handle: string;
  status: AgentStatus;
}

export interface AgentStatsEvent {
  type: "agent.stats";
  agentId: string;
  handle: string;
  tokensUsed: number;
  costUsdCents: number;
  lastActive: number;
}

export interface AgentAddedEvent {
  type: "agent.added";
  agent: Agent;
}

export interface AgentRemovedEvent {
  type: "agent.removed";
  agentId: string;
  handle: string;
}

export type RoomEvent =
  | MessageNewEvent
  | OpNewEvent
  | AgentStatusEvent
  | AgentStatsEvent
  | AgentAddedEvent
  | AgentRemovedEvent;

export interface ClientPing {
  type: "ping";
  t: number;
}

export type ClientRoomMessage = ClientPing;

export interface SessionStreamChunk {
  type: "pty.data";
  agentId: string;
  bytes: string;
  t: number;
}

export interface SessionStreamExit {
  type: "pty.exit";
  agentId: string;
  exitCode: number | null;
  t: number;
}

export type SessionStreamEvent = SessionStreamChunk | SessionStreamExit;
