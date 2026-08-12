import { describe, expect, it, vi } from "vitest";

import type { DataStreamPart } from "../data-stream-controller";
import {
  createInitialArtifactSessionState,
  reduceArtifactSessionPart,
  reduceSetContent,
} from "./state";
import type { ArtifactKindAdapter, ArtifactSessionState } from "./types";

type TextPart =
  | { type: "data-id"; data: string }
  | { type: "data-title"; data: string }
  | { type: "data-kind"; data: string }
  | { type: "data-clear"; data: null }
  | { type: "data-finish"; data: null }
  | { type: "data-textDelta"; data: string }
  | { type: "data-unknown"; data: unknown };

const textAdapter: ArtifactKindAdapter<TextPart, "text"> = {
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

const EMPTY_WHITEBOARD = '{"elements":[]}';

const whiteboardAdapter: ArtifactKindAdapter<DataStreamPart, "whiteboard"> = {
  kind: "whiteboard",
  initialContent: () => EMPTY_WHITEBOARD,
  clear: () => EMPTY_WHITEBOARD,
  reducePart: ({ part }) => {
    if (part.type !== "data-whiteboardDelta") {
      return null;
    }
    return String(part.data);
  },
};

function apply(
  state: ArtifactSessionState<"text">,
  part: TextPart
): ArtifactSessionState<"text"> {
  return reduceArtifactSessionPart(state, part, textAdapter);
}

describe(reduceArtifactSessionPart, () => {
  it("starts from the adapter initial snapshot", () => {
    expect(createInitialArtifactSessionState(textAdapter)).toStrictEqual({
      content: "",
      documentId: null,
      kind: "text",
      streamPhase: "idle",
      title: "",
    });
  });

  it("applies the text envelope and deltas", () => {
    let state = createInitialArtifactSessionState(textAdapter);
    state = apply(state, { type: "data-id", data: "doc-1" });
    state = apply(state, { type: "data-title", data: "Notes" });
    state = apply(state, { type: "data-kind", data: "text" });
    state = apply(state, { type: "data-clear", data: null });
    state = apply(state, { type: "data-textDelta", data: "Hello" });
    state = apply(state, { type: "data-textDelta", data: " world" });
    state = apply(state, { type: "data-finish", data: null });

    expect(state).toStrictEqual({
      content: "Hello world",
      documentId: "doc-1",
      kind: "text",
      streamPhase: "idle",
      title: "Notes",
    });
  });

  it("rejects non-string envelope payloads without coercion", () => {
    const state = createInitialArtifactSessionState(textAdapter);

    expect(() =>
      apply(state, { type: "data-id", data: { id: 1 } } as unknown as TextPart)
    ).toThrow(/data-id requires string data/u);

    expect(() =>
      apply(state, { type: "data-title", data: 12 } as unknown as TextPart)
    ).toThrow(/data-title requires string data/u);

    expect(() =>
      apply(state, { type: "data-clear", data: "" } as unknown as TextPart)
    ).toThrow(/data-clear requires null data/u);

    expect(() =>
      apply(state, {
        type: "data-finish",
        data: undefined,
      } as unknown as TextPart)
    ).toThrow(/data-finish requires null data/u);
  });

  it("throws on kind mismatch and leaves callers to keep prior state", () => {
    const state = createInitialArtifactSessionState(textAdapter);
    expect(() => apply(state, { type: "data-kind", data: "code" })).toThrow(
      /does not match session kind/u
    );
  });

  it("resets content and title when document id changes", () => {
    let state = createInitialArtifactSessionState(textAdapter);
    state = apply(state, { type: "data-id", data: "a" });
    state = apply(state, { type: "data-title", data: "First" });
    state = apply(state, { type: "data-textDelta", data: "body" });
    state = apply(state, { type: "data-id", data: "b" });

    expect(state).toStrictEqual({
      content: "",
      documentId: "b",
      kind: "text",
      streamPhase: "streaming",
      title: "",
    });
  });

  it("keeps document id on clear", () => {
    let state = createInitialArtifactSessionState(textAdapter);
    state = apply(state, { type: "data-id", data: "doc-1" });
    state = apply(state, { type: "data-textDelta", data: "x" });
    state = apply(state, { type: "data-clear", data: null });

    expect(state.documentId).toBe("doc-1");
    expect(state.content).toBe("");
    expect(state.streamPhase).toBe("streaming");
  });

  it("ignores unknown kind parts", () => {
    const state = createInitialArtifactSessionState(textAdapter);
    const next = apply(state, { type: "data-unknown", data: 1 });
    expect(next).toBe(state);
  });

  it("does not let adapters set streamPhase; finish owns idle", () => {
    let state = createInitialArtifactSessionState(whiteboardAdapter);
    state = reduceArtifactSessionPart(
      state,
      { type: "data-id", data: "w-1" },
      whiteboardAdapter
    );
    state = reduceArtifactSessionPart(
      state,
      { type: "data-whiteboardDelta", data: '{"elements":[1]}' },
      whiteboardAdapter
    );
    expect(state.streamPhase).toBe("streaming");
    expect(state.content).toBe('{"elements":[1]}');

    state = reduceArtifactSessionPart(
      state,
      { type: "data-clear", data: null },
      whiteboardAdapter
    );
    expect(state.content).toBe(EMPTY_WHITEBOARD);
    expect(state.streamPhase).toBe("streaming");

    state = reduceArtifactSessionPart(
      state,
      { type: "data-finish", data: null },
      whiteboardAdapter
    );
    expect(state.streamPhase).toBe("idle");
  });

  it("propagates adapter throws", () => {
    const exploding: ArtifactKindAdapter<DataStreamPart, "text"> = {
      ...textAdapter,
      reducePart: () => {
        throw new Error("boom");
      },
    };
    const state = createInitialArtifactSessionState(exploding);
    expect(() =>
      reduceArtifactSessionPart(
        state,
        { type: "data-textDelta", data: "x" },
        exploding
      )
    ).toThrow("boom");
  });

  it("setContent does not change streamPhase", () => {
    const idle = createInitialArtifactSessionState(textAdapter);
    const next = reduceSetContent(idle, "local");
    expect(next.content).toBe("local");
    expect(next.streamPhase).toBe("idle");
  });

  it("returns the same reference when a transition is a no-op", () => {
    let state = createInitialArtifactSessionState(textAdapter);
    state = apply(state, { type: "data-id", data: "doc-1" });
    const sameId = apply(state, { type: "data-id", data: "doc-1" });
    expect(sameId).toBe(state);

    const finished = apply(state, { type: "data-finish", data: null });
    const finishAgain = apply(finished, { type: "data-finish", data: null });
    expect(finishAgain).toBe(finished);
  });
});

describe("identity initialContent vs clear", () => {
  it("uses initialContent on id change and clear on data-clear", () => {
    const initialContent = vi.fn(() => "INIT");
    const clear = vi.fn(() => "CLEARED");
    const adapter: ArtifactKindAdapter<DataStreamPart, "text"> = {
      kind: "text",
      initialContent,
      clear,
      reducePart: () => null,
    };

    let state = createInitialArtifactSessionState(adapter);
    expect(initialContent).toHaveBeenCalledOnce();

    state = reduceArtifactSessionPart(
      state,
      { type: "data-id", data: "a" },
      adapter
    );
    state = reduceArtifactSessionPart(
      state,
      { type: "data-id", data: "b" },
      adapter
    );
    expect(state.content).toBe("INIT");
    expect(clear).not.toHaveBeenCalled();

    state = reduceArtifactSessionPart(
      state,
      { type: "data-clear", data: null },
      adapter
    );
    expect(state.content).toBe("CLEARED");
    expect(clear).toHaveBeenCalledOnce();
  });
});
