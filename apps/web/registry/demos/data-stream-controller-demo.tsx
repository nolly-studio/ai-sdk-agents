"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataStreamController,
  DataStreamControllerClear,
  DataStreamControllerFrame,
  DataStreamControllerLog,
  DataStreamControllerLogEmpty,
  DataStreamControllerLogItem,
  DataStreamControllerStatus,
  DataStreamControllerToolbar,
} from "@/components/ui/data-stream-controller";
import type { DataStreamPart } from "@/components/ui/data-stream-controller";

interface DemoPart extends DataStreamPart {
  type: "data-agent-text";
  data: { delta: string };
}

function DemoControls() {
  const { append } = DataStreamController.useController<DemoPart>();
  const { pendingCount } = DataStreamController.useStatus();

  return (
    <DataStreamControllerToolbar>
      <Button
        size="sm"
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
      <DataStreamControllerClear />
      <DataStreamControllerStatus />
    </DataStreamControllerToolbar>
  );
}

/**
 * Composition demo: headless DataStreamController + registry skin chrome.
 *
 * - Root owns the FIFO store
 * - Handler is the sole onPart sink (claim-before-dispatch)
 * - useController / useAppend are the ingress command surface
 * - Frame / Status / Log are styled-only (`registry/ui`)
 */
export function DataStreamControllerDemo() {
  const [log, setLog] = useState<string[]>([]);

  const onPart = useCallback(({ part }: { part: DemoPart }) => {
    setLog((prev) => [...prev, part.data.delta]);
  }, []);

  return (
    <DataStreamController.Root>
      <DataStreamController.Handler<DemoPart> onPart={onPart} />
      <DataStreamControllerFrame>
        <DemoControls />
        {log.length === 0 ? (
          <DataStreamControllerLogEmpty />
        ) : (
          <DataStreamControllerLog>
            {log.map((line, index) => (
              <DataStreamControllerLogItem key={`${index}-${line}`}>
                {line}
              </DataStreamControllerLogItem>
            ))}
          </DataStreamControllerLog>
        )}
      </DataStreamControllerFrame>
    </DataStreamController.Root>
  );
}
