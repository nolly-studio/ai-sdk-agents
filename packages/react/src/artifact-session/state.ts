import type { DataStreamPart } from "../data-stream-controller";
import type { ArtifactKindAdapter, ArtifactSessionState } from "./types";

const ENVELOPE_TYPES = new Set([
  "data-id",
  "data-title",
  "data-kind",
  "data-clear",
  "data-finish",
]);

export function createInitialArtifactSessionState<
  TPart extends DataStreamPart,
  K extends string,
>(adapter: ArtifactKindAdapter<TPart, K>): ArtifactSessionState<K> {
  return {
    content: adapter.initialContent(),
    documentId: null,
    kind: adapter.kind,
    streamPhase: "idle",
    title: "",
  };
}

function requireString(data: unknown, partType: string): string {
  if (typeof data !== "string") {
    throw new TypeError(
      `ArtifactSession: ${partType} requires string data, received ${typeof data}`
    );
  }
  return data;
}

function requireNull(data: unknown, partType: string): null {
  if (data !== null) {
    throw new Error(
      `ArtifactSession: ${partType} requires null data, received ${typeof data}`
    );
  }
  return null;
}

/**
 * Pure transition for one stream part or local command.
 * Throws before commit on invalid envelope payloads / kind mismatch / adapter errors.
 */
export function reduceArtifactSessionPart<
  TPart extends DataStreamPart,
  K extends string,
>(
  state: ArtifactSessionState<K>,
  part: TPart,
  adapter: ArtifactKindAdapter<TPart, K>
): ArtifactSessionState<K> {
  switch (part.type) {
    case "data-id": {
      const documentId = requireString(part.data, "data-id");

      if (state.documentId === null) {
        return {
          ...state,
          documentId,
          streamPhase: "streaming",
        };
      }

      if (state.documentId === documentId) {
        if (state.streamPhase === "streaming") {
          return state;
        }
        return {
          ...state,
          streamPhase: "streaming",
        };
      }

      return {
        content: adapter.initialContent(),
        documentId,
        kind: state.kind,
        streamPhase: "streaming",
        title: "",
      };
    }
    case "data-title": {
      const title = requireString(part.data, "data-title");
      if (state.title === title && state.streamPhase === "streaming") {
        return state;
      }
      return {
        ...state,
        streamPhase: "streaming",
        title,
      };
    }
    case "data-kind": {
      const kind = requireString(part.data, "data-kind");
      if (kind !== state.kind) {
        throw new Error(
          `ArtifactSession: data-kind "${kind}" does not match session kind "${state.kind}"`
        );
      }
      if (state.streamPhase === "streaming") {
        return state;
      }
      return {
        ...state,
        streamPhase: "streaming",
      };
    }
    case "data-clear": {
      requireNull(part.data, "data-clear");
      const content = adapter.clear(state);
      if (content === state.content && state.streamPhase === "streaming") {
        return state;
      }
      return {
        ...state,
        content,
        streamPhase: "streaming",
      };
    }
    case "data-finish": {
      requireNull(part.data, "data-finish");
      if (state.streamPhase === "idle") {
        return state;
      }
      return {
        ...state,
        streamPhase: "idle",
      };
    }
    default: {
      if (ENVELOPE_TYPES.has(part.type)) {
        // Exhaustiveness for known envelope names handled above.
        return state;
      }

      const nextContent = adapter.reducePart({ part, state });
      if (nextContent === null) {
        return state;
      }
      if (nextContent === state.content && state.streamPhase === "streaming") {
        return state;
      }
      return {
        ...state,
        content: nextContent,
        streamPhase: "streaming",
      };
    }
  }
}

export function reduceSetContent<K extends string>(
  state: ArtifactSessionState<K>,
  content: string
): ArtifactSessionState<K> {
  if (state.content === content) {
    return state;
  }
  return {
    ...state,
    content,
  };
}
