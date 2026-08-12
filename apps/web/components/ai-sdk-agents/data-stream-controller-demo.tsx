"use client";

import { DataStreamController } from "@aisdkagents/react";
import { Button } from "@workspace/ui/components/button";
import { useCallback, useState } from "react";

interface DemoPart {
  type: "data-agent-text";
  data: { delta: string };
  id?: string;
}

function DemoControls() {
  const { append, clear } = DataStreamController.useController<DemoPart>();
  const { pendingCount } = DataStreamController.useStatus();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() =>
          append({
            data: { delta: `chunk-${pendingCount + 1}` },
            type: "data-agent-text",
          })
        }
      >
        Append part
      </Button>
      <Button type="button" variant="outline" onClick={() => clear()}>
        Clear queue
      </Button>
      <span className="text-muted-foreground text-xs">
        pending: {pendingCount}
      </span>
    </div>
  );
}

/**
 * Minimal DataStreamController anatomy demo.
 *
 * - Root owns the FIFO store
 * - Handler is the sole onPart sink (claim-before-dispatch)
 * - useController / useAppend are the ingress command surface
 *
 * Common artifact deltas (id/title/kind/clear/finish) are NOT applied here.
 * A future ArtifactSession adapter owns that.
 */
export function DataStreamControllerDemo() {
  const [log, setLog] = useState<string[]>([]);

  const onPart = useCallback(({ part }: { part: DemoPart }) => {
    setLog((prev) => [...prev, part.data.delta]);
  }, []);

  return (
    <DataStreamController.Root>
      <DataStreamController.Handler<DemoPart> onPart={onPart} />
      <DemoControls />
      <ul className="mt-4 space-y-1 font-mono text-sm">
        {log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </DataStreamController.Root>
  );
}
