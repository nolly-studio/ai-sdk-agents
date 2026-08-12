import type {
  DataStreamControllerApi,
  DataStreamPart,
  DataStreamStatus,
} from "./types";

/**
 * Private Root-lifetime store. Not part of the public package surface.
 */
export type DataStreamStore<TPart extends DataStreamPart = DataStreamPart> =
  DataStreamControllerApi<TPart> & {
    /** Stable public command object for hooks. */
    readonly api: DataStreamControllerApi<TPart>;
    getStatus: () => DataStreamStatus;
    subscribe: (listener: () => void) => () => void;
    /** Atomically claim the pending queue as one immutable batch. */
    claim: () => readonly TPart[];
    /** Strict Mode lifecycle: inert commands while inactive. */
    activate: () => void;
    deactivate: () => void;
  };

const EMPTY_STATUS: DataStreamStatus = {
  hasPendingParts: false,
  pendingCount: 0,
};

/**
 * Creates one Root-lifetime FIFO store with stable command references.
 *
 * Starts active so pure tests and pre-effect appends work. Root (M3) will
 * deactivate/reactivate around its effect lifecycle for Strict Mode safety.
 */
export function createDataStreamStore<
  TPart extends DataStreamPart = DataStreamPart,
>(): DataStreamStore<TPart> {
  const listeners = new Set<() => void>();
  let queue: TPart[] = [];
  let status: DataStreamStatus = EMPTY_STATUS;
  let active = true;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const publishStatus = () => {
    const pendingCount = queue.length;
    const hasPendingParts = pendingCount > 0;

    if (
      status.pendingCount === pendingCount &&
      status.hasPendingParts === hasPendingParts
    ) {
      return;
    }

    status =
      pendingCount === 0 ? EMPTY_STATUS : { hasPendingParts, pendingCount };
    notify();
  };

  const append = (part: TPart) => {
    if (!active) {
      return;
    }
    queue.push(part);
    publishStatus();
  };

  const appendMany = (parts: readonly TPart[]) => {
    if (!active || parts.length === 0) {
      return;
    }
    queue.push(...parts);
    publishStatus();
  };

  const clear = () => {
    if (!active || queue.length === 0) {
      return;
    }
    queue = [];
    publishStatus();
  };

  const claim = (): readonly TPart[] => {
    if (queue.length === 0) {
      return [];
    }
    const batch = queue;
    queue = [];
    publishStatus();
    return batch;
  };

  const getStatus = () => status;

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

  const api: DataStreamControllerApi<TPart> = {
    append,
    appendMany,
    clear,
  };

  return {
    ...api,
    activate,
    api,
    claim,
    deactivate,
    getStatus,
    subscribe,
  };
}
