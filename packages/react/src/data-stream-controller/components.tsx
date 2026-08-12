"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { DataStreamControllerContext, useDataStreamStore } from "./context";
import { deliverBatch } from "./dispatch";
import { createDataStreamStore } from "./store";
import type {
  DataStreamPart,
  DataStreamPartErrorHandler,
  DataStreamPartHandler,
} from "./types";

export interface DataStreamControllerRootProps {
  children?: ReactNode;
}

/**
 * Provides one Root-lifetime stream store to descendants.
 *
 * Activates/deactivates the store in an effect so Strict Mode cleanup makes
 * captured commands inert without clearing the pending queue.
 */
export function DataStreamControllerRoot({
  children,
}: DataStreamControllerRootProps) {
  const [store] = useState(() => createDataStreamStore());

  useEffect(() => {
    store.activate();
    return () => {
      store.deactivate();
    };
  }, [store]);

  return (
    <DataStreamControllerContext.Provider value={store}>
      {children}
    </DataStreamControllerContext.Provider>
  );
}

export interface DataStreamControllerHandlerProps<
  TPart extends DataStreamPart = DataStreamPart,
> {
  onPart: DataStreamPartHandler<TPart>;
  onError?: DataStreamPartErrorHandler<TPart>;
}

/**
 * Sole drain owner for its Root. Renders nothing.
 *
 * Claims the pending queue in a normal effect, then synchronously attempts
 * each part. Callback props are read from refs so replacements apply without
 * re-claiming an already empty queue for identity reasons alone.
 */
export function DataStreamControllerHandler<
  TPart extends DataStreamPart = DataStreamPart,
>({ onPart, onError }: DataStreamControllerHandlerProps<TPart>) {
  const store = useDataStreamStore<TPart>();
  const onPartRef = useRef(onPart);
  const onErrorRef = useRef(onError);
  onPartRef.current = onPart;
  onErrorRef.current = onError;

  const status = useSyncExternalStore(
    store.subscribe,
    store.getStatus,
    store.getStatus
  );

  useEffect(() => {
    if (!status.hasPendingParts) {
      return;
    }

    const batch = store.claim();
    if (batch.length === 0) {
      return;
    }

    const errorHandler = onErrorRef.current;
    deliverBatch({
      onError: errorHandler
        ? (event) => {
            onErrorRef.current?.(event);
          }
        : undefined,
      onPart: (event) => {
        onPartRef.current(event);
      },
      parts: batch,
    });
  }, [status, store]);

  return null;
}
