import type { DataUIPart } from "ai";

export type AgentWhiteboardDataParts = {
  whiteboardDelta: string;
  id: string;
  title: string;
  kind: "whiteboard";
  clear: null;
  finish: null;
};

export type AgentWhiteboardDataPart = DataUIPart<AgentWhiteboardDataParts>;

/** Empty scene JSON used by canvas Patterns on clear. */
export const EMPTY_WHITEBOARD_JSON = '{"elements":[],"appState":{}}';
