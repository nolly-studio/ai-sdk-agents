import type { ArtifactKindAdapter } from "../../types";
import { EMPTY_WHITEBOARD_JSON } from "./types";
import type { AgentWhiteboardDataPart } from "./types";

/**
 * Whiteboard adapter: clear uses empty scene JSON; deltas replace content.
 * Scene readiness is app-derived — streamPhase stays core-owned.
 */
export const whiteboardAdapter: ArtifactKindAdapter<
  AgentWhiteboardDataPart,
  "whiteboard"
> = {
  kind: "whiteboard",
  initialContent: () => EMPTY_WHITEBOARD_JSON,
  clear: () => EMPTY_WHITEBOARD_JSON,
  reducePart: ({ part }) => {
    if (part.type !== "data-whiteboardDelta") {
      return null;
    }
    return part.data;
  },
};
