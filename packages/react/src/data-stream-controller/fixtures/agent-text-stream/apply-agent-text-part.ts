import type { AgentTextArtifact, AgentTextDataPart } from "./types";
import { initialAgentTextArtifact } from "./types";

/**
 * Pattern-local artifact reducer used only for dogfood.
 * Future `ArtifactSession` owns this boundary.
 */
export function applyAgentTextPart(
  artifact: AgentTextArtifact,
  part: AgentTextDataPart
): AgentTextArtifact {
  switch (part.type) {
    case "data-id": {
      return {
        ...artifact,
        documentId: String(part.data),
        status: "streaming",
      };
    }
    case "data-title": {
      return {
        ...artifact,
        title: String(part.data),
        status: "streaming",
      };
    }
    case "data-kind": {
      return {
        ...artifact,
        kind: part.data,
        status: "streaming",
      };
    }
    case "data-clear": {
      return {
        ...artifact,
        content: "",
        status: "streaming",
      };
    }
    case "data-finish": {
      return {
        ...artifact,
        status: "idle",
      };
    }
    case "data-textDelta": {
      return {
        ...artifact,
        content: `${artifact.content}${part.data}`,
        status: "streaming",
      };
    }
    default: {
      const _exhaustive: never = part;
      return _exhaustive;
    }
  }
}

export function createAgentTextSink(options?: {
  onChange?: (artifact: AgentTextArtifact) => void;
}) {
  let artifact: AgentTextArtifact = { ...initialAgentTextArtifact };

  return {
    getArtifact: () => artifact,
    onPart: ({ part }: { part: AgentTextDataPart }) => {
      artifact = applyAgentTextPart(artifact, part);
      options?.onChange?.(artifact);
    },
    reset: () => {
      artifact = { ...initialAgentTextArtifact };
    },
  };
}
