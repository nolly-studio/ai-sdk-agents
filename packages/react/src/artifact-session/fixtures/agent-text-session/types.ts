import type { DataUIPart } from "ai";

/**
 * Dogfood part union mirroring agent-text-artifact.
 * Not a published package surface.
 */
export type AgentTextDataParts = {
  textDelta: string;
  id: string;
  title: string;
  kind: "text";
  clear: null;
  finish: null;
};

export type AgentTextDataPart = DataUIPart<AgentTextDataParts>;
