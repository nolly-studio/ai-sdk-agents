# DataStreamController

Observer/controller primitive that FIFO-buffers AI SDK UI data parts and delivers them in order to one consumer sink.

> Frozen v1 interface: [`INTERFACE.md`](./INTERFACE.md). Plan: [`PLAN.md`](./PLAN.md). Behavior + dogfood + publish prep complete. Package remains `private` until M6.

## Anatomy

```tsx
import type { DataUIPart } from "ai";
import {
  DataStreamController,
  type DataStreamPartHandler,
} from "@ai-sdk-agents/react";

type AgentDataPart = DataUIPart<AgentTextDataParts>;

const handlePart: DataStreamPartHandler<AgentDataPart> = ({ part }) => {
  // Temporary Pattern-local adapter. ArtifactSession owns this later.
  applyAgentTextPart(part);
};

function Demo() {
  return (
    <DataStreamController.Root>
      <DataStreamController.Handler onPart={handlePart} />
      <Chat />
    </DataStreamController.Root>
  );
}

function Chat() {
  const append = DataStreamController.useAppend<AgentDataPart>();
  useChat<AgentTextUIMessage>({ onData: append });
  // ...
}
```

## Public surface

| Export          | Role                                                    |
| --------------- | ------------------------------------------------------- |
| `Root`          | One Root-lifetime FIFO store via stable context         |
| `Handler`       | Sole drain owner; requires `onPart`, optional `onError` |
| `useController` | `append` / `appendMany` / `clear`                       |
| `useAppend`     | Stable `onData` callback                                |
| `useStatus`     | `{ pendingCount, hasPendingParts }`                     |

Private (not exported): store claim/subscribe, `deliverBatch`.

## Ownership

| Owns | Does not own |
| --- | --- |
| FIFO queue and delivery attempts | Artifact document state or common-delta mutation |
| Append command for `useChat({ onData })` | Kind registries, panel chrome, or editors |
| Selective pending-status subscriptions | Message list, transport, or sticky scroll |

One Handler per Root. A future `ArtifactSession.Stream` consumes this Handler seam for artifact-specific deltas.
