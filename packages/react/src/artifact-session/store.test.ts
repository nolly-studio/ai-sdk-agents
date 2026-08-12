import { describe, expect, it, vi } from "vitest";

import { createArtifactSessionStore } from "./store";
import type { ArtifactKindAdapter } from "./types";

type TextPart =
  | { type: "data-id"; data: string }
  | { type: "data-textDelta"; data: string }
  | { type: "data-finish"; data: null };

const adapter: ArtifactKindAdapter<TextPart, "text"> = {
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

describe(createArtifactSessionStore, () => {
  it("applies parts and notifies subscribers", () => {
    const store = createArtifactSessionStore(adapter);
    const listener = vi.fn();
    store.subscribe(listener);

    store.applyPart({ type: "data-id", data: "1" });
    store.applyPart({ type: "data-textDelta", data: "hi" });

    expect(store.getSnapshot()).toMatchObject({
      content: "hi",
      documentId: "1",
      streamPhase: "streaming",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not notify when the snapshot is unchanged", () => {
    const store = createArtifactSessionStore(adapter);
    store.applyPart({ type: "data-id", data: "1" });
    const listener = vi.fn();
    store.subscribe(listener);

    store.applyPart({ type: "data-id", data: "1" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps state across deactivate/activate and ignores inert commands", () => {
    const store = createArtifactSessionStore(adapter);
    store.applyPart({ type: "data-id", data: "1" });
    store.applyPart({ type: "data-textDelta", data: "kept" });

    store.deactivate();
    store.applyPart({ type: "data-textDelta", data: "ignored" });
    store.setContent("ignored-local");
    store.reset();

    expect(store.getSnapshot()).toMatchObject({
      content: "kept",
      documentId: "1",
      streamPhase: "streaming",
    });

    store.activate();
    store.applyPart({ type: "data-finish", data: null });
    expect(store.getSnapshot().streamPhase).toBe("idle");
  });

  it("exposes stable command references on api", () => {
    const store = createArtifactSessionStore(adapter);
    const { applyPart, setContent, reset, api } = store;
    expect(store.applyPart).toBe(applyPart);
    expect(store.api.applyPart).toBe(applyPart);
    expect(api.setContent).toBe(setContent);
    expect(api.reset).toBe(reset);
  });

  it("unsubscribes cleanly", () => {
    const store = createArtifactSessionStore(adapter);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.applyPart({ type: "data-id", data: "1" });
    expect(listener).not.toHaveBeenCalled();
  });
});
