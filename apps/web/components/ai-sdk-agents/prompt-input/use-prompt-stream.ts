"use client";

import type {
  PromptInputMessage,
  PromptInputStatus,
} from "@aisdkagents/react/prompt-input";
import * as React from "react";

export type PromptStreamHandlers = {
  /**
   * App transport: call your AI SDK / fetch stream here.
   * Resolve when the stream finishes; reject on error.
   * Call `signal` abort when the user hits Stop.
   */
  send: (
    message: PromptInputMessage,
    signal: AbortSignal
  ) => Promise<void> | void;
};

/**
 * App-layer streaming / network transport helper.
 * Wires `status` + `onStop` for `PromptInput.Root` / `Submit`.
 */
export function usePromptStream({ send }: PromptStreamHandlers) {
  const [status, setStatus] = React.useState<PromptInputStatus>("ready");
  const abortRef = React.useRef<AbortController | null>(null);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("ready");
  }, []);

  const onSubmit = React.useCallback(
    async (
      _event: React.FormEvent<HTMLFormElement>,
      message: PromptInputMessage
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("submitted");
      try {
        setStatus("streaming");
        await send(message, controller.signal);
        if (!controller.signal.aborted) {
          setStatus("ready");
        }
      } catch (cause) {
        if (controller.signal.aborted) {
          setStatus("ready");
          return;
        }
        setStatus("error");
        throw cause;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [send]
  );

  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  return {
    onStop: stop,
    onSubmit,
    status,
    submitting: status === "submitted" || status === "streaming",
  };
}
