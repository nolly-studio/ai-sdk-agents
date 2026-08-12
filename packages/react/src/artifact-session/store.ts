import type { DataStreamPart } from "../data-stream-controller";
import {
  createInitialArtifactSessionState,
  reduceArtifactSessionPart,
  reduceSetContent,
} from "./state";
import type {
  ArtifactKindAdapter,
  ArtifactSessionController,
  ArtifactSessionState,
} from "./types";

/**
 * Private Root-lifetime store. Not part of the public package surface.
 */
export type ArtifactSessionStore<
  TPart extends DataStreamPart,
  K extends string,
> = ArtifactSessionController<TPart> & {
  readonly api: ArtifactSessionController<TPart>;
  getSnapshot: () => ArtifactSessionState<K>;
  subscribe: (listener: () => void) => () => void;
  activate: () => void;
  deactivate: () => void;
};

export function createArtifactSessionStore<
  TPart extends DataStreamPart,
  K extends string,
>(adapter: ArtifactKindAdapter<TPart, K>): ArtifactSessionStore<TPart, K> {
  const listeners = new Set<() => void>();
  let snapshot = createInitialArtifactSessionState(adapter);
  let active = true;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const commit = (next: ArtifactSessionState<K>) => {
    if (next === snapshot) {
      return;
    }
    snapshot = next;
    notify();
  };

  const applyPart = (part: TPart) => {
    if (!active) {
      return;
    }
    commit(reduceArtifactSessionPart(snapshot, part, adapter));
  };

  const setContent = (content: string) => {
    if (!active) {
      return;
    }
    commit(reduceSetContent(snapshot, content));
  };

  const reset = () => {
    if (!active) {
      return;
    }
    commit(createInitialArtifactSessionState(adapter));
  };

  const getSnapshot = () => snapshot;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const activate = () => {
    active = true;
  };

  const deactivate = () => {
    active = false;
  };

  const api: ArtifactSessionController<TPart> = {
    applyPart,
    reset,
    setContent,
  };

  return {
    ...api,
    activate,
    api,
    deactivate,
    getSnapshot,
    subscribe,
  };
}
