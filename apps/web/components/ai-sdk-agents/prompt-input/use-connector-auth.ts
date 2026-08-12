"use client";

import * as React from "react";

export type ConnectorAuthStatus = "connected" | "connecting" | "idle" | "error";

export type UseConnectorAuthOptions = {
  /** App-owned OAuth / connect handler. Defaults to a short simulated delay. */
  connect?: (sourceId: string) => Promise<void> | void;
  /** Initial connected source ids (e.g. from session). */
  defaultConnected?: readonly string[];
};

function wait(ms: number): Promise<undefined> {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  window.setTimeout(() => {
    resolve();
  }, ms);
  return promise;
}

/**
 * App-layer connector auth state. Pair with `PromptInput.Source action="connect"`.
 * Real OAuth lives in `connect` — this hook only tracks connected ids + status.
 */
export function useConnectorAuth(options: UseConnectorAuthOptions = {}) {
  const { connect, defaultConnected = [] } = options;
  const [connected, setConnected] = React.useState(
    () => new Set(defaultConnected)
  );
  const [statusById, setStatusById] = React.useState(
    () => new Map<string, ConnectorAuthStatus>()
  );
  const [error, setError] = React.useState<string | null>(null);

  const isConnected = React.useCallback(
    (sourceId: string) => connected.has(sourceId),
    [connected]
  );

  const statusOf = React.useCallback(
    (sourceId: string): ConnectorAuthStatus =>
      statusById.get(sourceId) ??
      (connected.has(sourceId) ? "connected" : "idle"),
    [connected, statusById]
  );

  const connectSource = React.useCallback(
    async (sourceId: string) => {
      if (connected.has(sourceId)) {
        return;
      }
      setError(null);
      setStatusById((prev) => new Map(prev).set(sourceId, "connecting"));
      try {
        await (connect ? connect(sourceId) : wait(600));
        setConnected((prev) => new Set(prev).add(sourceId));
        setStatusById((prev) => new Map(prev).set(sourceId, "connected"));
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Failed to connect";
        setError(message);
        setStatusById((prev) => new Map(prev).set(sourceId, "error"));
      }
    },
    [connect, connected]
  );

  const disconnectSource = React.useCallback((sourceId: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      next.delete(sourceId);
      return next;
    });
    setStatusById((prev) => {
      const next = new Map(prev);
      next.delete(sourceId);
      return next;
    });
  }, []);

  return {
    connectSource,
    connected,
    disconnectSource,
    error,
    isConnected,
    statusOf,
  };
}
