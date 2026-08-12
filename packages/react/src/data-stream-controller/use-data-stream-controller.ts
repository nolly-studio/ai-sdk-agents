"use client";

import { useSyncExternalStore } from "react";

import { useDataStreamStore } from "./context";
import type {
  DataStreamControllerApi,
  DataStreamPart,
  DataStreamStatus,
} from "./types";

/**
 * Stable `append`, `appendMany`, and `clear` for the nearest Root.
 */
export function useDataStreamController<
  TPart extends DataStreamPart = DataStreamPart,
>(): DataStreamControllerApi<TPart> {
  return useDataStreamStore<TPart>().api;
}

/**
 * Stable append helper intended for `useChat({ onData: append })`.
 */
export function useDataStreamAppend<
  TPart extends DataStreamPart = DataStreamPart,
>(): DataStreamControllerApi<TPart>["append"] {
  return useDataStreamStore<TPart>().append;
}

/**
 * Selective `{ pendingCount, hasPendingParts }` subscription.
 */
export function useDataStreamStatus(): DataStreamStatus {
  const store = useDataStreamStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getStatus,
    store.getStatus
  );
}
