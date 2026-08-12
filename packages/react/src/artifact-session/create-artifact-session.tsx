"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { DataStreamControllerHandler } from "../data-stream-controller";
import type { DataStreamPart } from "../data-stream-controller";
import { createArtifactSessionStore } from "./store";
import type { ArtifactSessionStore } from "./store";
import type {
  ArtifactKindAdapter,
  ArtifactSessionController,
  ArtifactSessionNamespace,
  ArtifactSessionRootProps,
  ArtifactSessionState,
  ArtifactSessionStreamProps,
} from "./types";

/**
 * Bind one kind adapter into a typed session namespace (Root / Stream / hooks).
 */
export function createArtifactSession<
  TPart extends DataStreamPart,
  K extends string,
>(options: {
  adapter: ArtifactKindAdapter<TPart, K>;
}): ArtifactSessionNamespace<TPart, K> {
  const { adapter } = options;

  const ArtifactSessionContext = createContext<ArtifactSessionStore<
    TPart,
    K
  > | null>(null);

  function useStore(): ArtifactSessionStore<TPart, K> {
    const store = useContext(ArtifactSessionContext);
    if (!store) {
      throw new Error(
        "ArtifactSession components must be used within the Root returned by createArtifactSession()"
      );
    }
    return store;
  }

  function Root({ children }: ArtifactSessionRootProps) {
    const [store] = useState(() => createArtifactSessionStore(adapter));

    useEffect(() => {
      store.activate();
      return () => {
        store.deactivate();
      };
    }, [store]);

    return (
      <ArtifactSessionContext.Provider value={store}>
        {children}
      </ArtifactSessionContext.Provider>
    );
  }

  function Stream({ onError }: ArtifactSessionStreamProps<TPart>) {
    const store = useStore();

    return (
      <DataStreamControllerHandler<TPart>
        onError={onError}
        onPart={({ part }) => {
          store.applyPart(part);
        }}
      />
    );
  }

  function useController(): ArtifactSessionController<TPart> {
    return useStore().api;
  }

  function useSnapshot(): ArtifactSessionState<K> {
    const store = useStore();
    return useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot
    );
  }

  function useSelector<T>(selector: (state: ArtifactSessionState<K>) => T): T {
    const store = useStore();
    return useSyncExternalStore(
      store.subscribe,
      () => selector(store.getSnapshot()),
      () => selector(store.getSnapshot())
    );
  }

  return {
    Root,
    Stream,
    useController,
    useSelector,
    useSnapshot,
  };
}
