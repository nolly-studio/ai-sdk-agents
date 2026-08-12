import type { DataUIPart } from "ai";

/**
 * Mirrors `agent-text-artifact` data parts for dogfood only.
 * Not a published package surface.
 */
// `type` (not `interface`) — AI SDK `UIDataTypes` requires an indexable alias.
export type AgentTextDataParts = {
  textDelta: string;
  id: string;
  title: string;
  kind: "text";
  clear: null;
  finish: null;
};

export type AgentTextDataPart = DataUIPart<AgentTextDataParts>;

export interface AgentTextArtifact {
  title: string;
  documentId: string;
  kind: "text";
  content: string;
  status: "streaming" | "idle";
}

export const initialAgentTextArtifact: AgentTextArtifact = {
  content: "",
  documentId: "init",
  kind: "text",
  status: "idle",
  title: "",
};
