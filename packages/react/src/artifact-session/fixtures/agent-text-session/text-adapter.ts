import type { ArtifactKindAdapter } from "../../types";
import type { AgentTextDataPart } from "./types";

/**
 * Pattern-shaped text adapter: deltas append (catalog behavior).
 */
export const textAdapter: ArtifactKindAdapter<AgentTextDataPart, "text"> = {
  kind: "text",
  initialContent: () => "",
  clear: () => "",
  reducePart: ({ part, state }) => {
    if (part.type !== "data-textDelta") {
      return null;
    }
    return `${state.content}${part.data}`;
  },
};
