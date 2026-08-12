"use client";

import { useCallback, useRef, useState } from "react";

import type { ArtifactKindAdapter } from "@/components/ui/artifact-session";
import {
  createArtifactSession,
  createArtifactSessionSkin,
} from "@/components/ui/artifact-session";
import { Button } from "@/components/ui/button";
import {
  DataStreamController,
  DataStreamControllerFrame,
  DataStreamControllerStatus,
  DataStreamControllerToolbar,
} from "@/components/ui/data-stream-controller";

type DemoPart =
  | { type: "data-id"; data: string; id?: string }
  | { type: "data-title"; data: string; id?: string }
  | { type: "data-kind"; data: "text"; id?: string }
  | { type: "data-textDelta"; data: string; id?: string }
  | { type: "data-clear"; data: null; id?: string }
  | { type: "data-finish"; data: null; id?: string };

const textAdapter: ArtifactKindAdapter<DemoPart, "text"> = {
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

const DemoSession = createArtifactSession({ adapter: textAdapter });
const DemoSkin = createArtifactSessionSkin(DemoSession);

const SAMPLE_CHUNKS = [
  "ArtifactSession ",
  "owns the document ",
  "snapshot — ",
  "id, title, kind, ",
  "content, and streamPhase.",
];

function DemoControls() {
  const { append, appendMany } = DataStreamController.useController<DemoPart>();
  const [streaming, setStreaming] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) {
      window.clearTimeout(id);
    }
    timers.current = [];
  }, []);

  const runStream = useCallback(() => {
    if (streaming) {
      return;
    }
    clearTimers();
    setStreaming(true);

    const docId = `doc-${Date.now().toString(36)}`;
    appendMany([
      { type: "data-id", data: docId },
      { type: "data-title", data: "Streaming note" },
      { type: "data-kind", data: "text" },
    ]);

    for (const [index, chunk] of SAMPLE_CHUNKS.entries()) {
      const id = window.setTimeout(
        () => {
          append({ type: "data-textDelta", data: chunk });
          if (index === SAMPLE_CHUNKS.length - 1) {
            const finishId = window.setTimeout(() => {
              append({ type: "data-finish", data: null });
              setStreaming(false);
            }, 180);
            timers.current.push(finishId);
          }
        },
        220 * (index + 1)
      );
      timers.current.push(id);
    }
  }, [append, appendMany, clearTimers, streaming]);

  const clearDocument = useCallback(() => {
    clearTimers();
    setStreaming(false);
    append({ type: "data-clear", data: null });
  }, [append, clearTimers]);

  return (
    <DataStreamControllerToolbar>
      <Button disabled={streaming} size="sm" type="button" onClick={runStream}>
        {streaming ? "Streaming…" : "Stream sample"}
      </Button>
      <Button size="sm" type="button" variant="outline" onClick={clearDocument}>
        Clear content
      </Button>
      <DemoSkin.Reset />
      <DataStreamControllerStatus />
      <DemoSkin.PhaseBadge />
    </DataStreamControllerToolbar>
  );
}

/**
 * Composition demo: DataStreamController transport + ArtifactSession document
 * store + registry panel skin.
 */
export function ArtifactSessionDemo() {
  return (
    <DataStreamController.Root>
      <DemoSession.Root>
        <DemoSession.Stream />
        <DataStreamControllerFrame className="gap-3">
          <DemoControls />
          <DemoSkin.Panel>
            <DemoSkin.Header>
              <div className="min-w-0 flex-1 space-y-1">
                <DemoSkin.Title />
                <DemoSkin.Meta />
              </div>
              <DemoSkin.PhaseBadge />
            </DemoSkin.Header>
            <DemoSkin.Content />
            <DemoSkin.Actions>
              <span className="text-muted-foreground text-xs">
                Envelope + kind deltas apply through{" "}
                <code className="font-mono">Stream</code> →{" "}
                <code className="font-mono">applyPart</code>.
              </span>
            </DemoSkin.Actions>
          </DemoSkin.Panel>
        </DataStreamControllerFrame>
      </DemoSession.Root>
    </DataStreamController.Root>
  );
}
