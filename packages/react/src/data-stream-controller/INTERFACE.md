# DataStreamController — Interface

> **Status:** Frozen v1. Behavior remains scaffold-only until M2–M3 implement the store, delivery, and React wiring against this surface.

## Domain contract

> This primitive manages **FIFO buffering and ordered delivery of AI SDK UI data parts** so consumers can connect `useChat({ onData })` to one stream sink without reimplementing provider, queue, and drain-effect plumbing.

The controller is transport behavior, not an artifact reducer. `data-id`, `data-title`, `data-kind`, `data-clear`, and `data-finish` are an artifact-stream protocol convention consumed by a future `ArtifactSession` adapter. The controller treats them exactly like every other `data-*` part.

## Vocabulary

| Term | Meaning |
| --- | --- |
| **part** | One structurally AI SDK-compatible `data-*` value received by `onData` |
| **pending queue** | Parts accepted by the Root but not yet claimed by Handler |
| **batch** | The immutable FIFO snapshot claimed by one Handler effect |
| **sink** | The single `onPart` callback that interprets delivered parts |
| **artifact-stream convention** | `id/title/kind/clear/finish` plus kind-specific data parts; owned outside controller core |

## Design objectives

1. **Collapse stream-ingress duplication** — Replace the cloned provider, append state, snapshot, and drain effect across artifact Patterns.
2. **Stay headless** — No Tailwind, icons, layout, panel chrome, editors, or semantic host element.
3. **Keep high-frequency writes local** — Appending a part must not rerender the Root subtree. Context transports a stable store reference; subscribed hooks use `useSyncExternalStore`.
4. **Invert control at one delivery seam** — The controller owns queue lifecycle and delivery attempts. The consumer supplies one opaque `onPart` sink.
5. **Remain AI SDK-shaped without a runtime dependency** — Accept a narrow structural `data-*` type while allowing consumers to use their exact `DataUIPart<TDataParts>` union.
6. **Preserve stream ordering** — A batch and all later batches deliver in append order. Parts appended during delivery belong to a later batch.
7. **Make lifecycle behavior explicit** — Define mount, Strict Mode, failure, retry, clear, and unmount behavior before implementation.
8. **Keep React thin** — Queue and delivery math remain pure; `"use client"` appears only on React entries.
9. **Expose semantic facts, not store machinery** — Public hooks may read `pendingCount` and `hasPendingParts`; buffer arrays, subscriptions, cursors, and generations remain private.
10. **Leave room for session adapters** — `ArtifactSession` may later wrap `Handler`, but DataStreamController never imports or mutates session state.

## Non-goals

| Out of scope | Owner |
| --- | --- |
| Artifact fields, status, visibility, metadata, and reset values | Future `ArtifactSession` / consumer |
| Recognition or application of common artifact deltas | Future `ArtifactSession` stream adapter |
| Kind lookup and kind-specific delta interpretation | Kind registry / consumer |
| Document versions and persistence | `DocumentVersionController` / app |
| Multiple independent consumers of one queue | A future broadcast controller, or separate Roots |
| Async handlers, acknowledgements, durable retry, exactly-once effects | App-level queue / future protocol |
| Chat messages, transport, history, auth | AI SDK / app |
| Styling, drawers, editors, focus, keyboard, ARIA | Styled/application surfaces |

## Architecture decision

```text
Archetype: Observer / controller
Durable state owner: Root-owned external FIFO store
Native platform contract: AI SDK UI data-part shape and onData callback
Selected seams: stable context reference, external store, imperative ingress,
  one null-render Handler, selective status subscription
Rejected seams: controlled buffer, descendant registration, SSR schema,
  render polymorphism, built-in artifact dispatch, public drain/subscription API
SSR strategy: no server behavior; empty status snapshot only
Interaction model: programmatic append → post-commit synchronous batch delivery
Performance sensitivity: streaming-rate writes must not rerender Root children
```

### State ownership

| Category | Values | Owner |
| --- | --- | --- |
| Domain state (Root lifetime) | Pending FIFO queue | Root's private external store |
| Derived render state | `pendingCount`, `hasPendingParts` | Store snapshot |
| Ephemeral command | `append`, `appendMany`, `clear` | Stable controller API |
| Private bookkeeping | listeners, current batch, delivery scheduling | Store / Handler |
| Consumer state | artifact, metadata, kind registry, retry policy | Sink / future adapter |

The queue is intentionally uncontrolled in v1. Controlled `parts/defaultParts/onPartsChange` props would make a transient, high-frequency implementation detail into two sources of truth and would allow a parent to reject delivery bookkeeping.

## Public surface — v1 (frozen)

### Structural types

```ts
export type DataStreamPart = {
  readonly type: `data-${string}`;
  readonly data: unknown;
  readonly id?: string;
};

export type DataStreamStatus = {
  readonly pendingCount: number;
  readonly hasPendingParts: boolean;
};

export type DataStreamControllerApi<
  TPart extends DataStreamPart = DataStreamPart,
> = {
  append(part: TPart): void;
  appendMany(parts: readonly TPart[]): void;
  clear(): void;
};

export type DataStreamPartHandler<
  TPart extends DataStreamPart = DataStreamPart,
> = (event: { readonly part: TPart }) => void;

export type DataStreamPartErrorHandler<
  TPart extends DataStreamPart = DataStreamPart,
> = (event: { readonly cause: unknown; readonly part: TPart }) => void;
```

`data` is required because AI SDK `DataUIPart<TDataParts>` requires it, including for signal-like parts whose payload is `null`. The template-literal `type` prevents message text, tool, reasoning, or file parts from entering this queue by accident.

### Namespace and flat exports

```ts
export const DataStreamController = {
  Root,
  Handler,
  useController,
  useAppend,
  useStatus,
};
```

Full-name flat exports remain available for direct imports:

- `DataStreamControllerRoot`
- `DataStreamControllerHandler`
- `useDataStreamController`
- `useDataStreamAppend`
- `useDataStreamStatus`

The namespace is meaningful because `Handler` can be mounted at the point where the consumer's sink context is available while sharing the Root's ingress queue.

### Root

```ts
export type DataStreamControllerRootProps = {
  children?: React.ReactNode;
};
```

Root creates exactly one store for its mounted lifetime and places only its stable API/reference in context. Root accepts no handlers, initial parts, controlled parts, or external store in v1.

### Handler

```ts
export type DataStreamControllerHandlerProps<
  TPart extends DataStreamPart = DataStreamPart,
> = {
  onPart: DataStreamPartHandler<TPart>;
  onError?: DataStreamPartErrorHandler<TPart>;
};
```

- `Handler` renders `null` and is the **sole drain owner** for its Root.
- Exactly one Handler must be mounted per Root. Multiple Handlers would race a destructive queue and are unsupported.
- `onPart` is a synchronous delivery attempt, called once for each claimed part in FIFO order.
- `onError` observes an exception thrown by `onPart`. Delivery continues with later parts in the batch. With no `onError`, all parts are still attempted and the first captured error is rethrown after the batch so the nearest error boundary can observe it.
- If `onError` itself throws, that exception is retained as an unhandled batch error and later parts are still attempted.
- No automatic retry occurs because a callback may throw after partially mutating its sink. A consumer that can retry idempotently may explicitly re-append the failed part from `onError`.
- Promise-returning handlers are unsupported in v1 and are not awaited.

There is no `applyCommonDeltas`, `getDispatchContext`, `setArtifact`, `setMetadata`, handler map, or batch-complete callback in v1.

### Hooks

| Hook | Contract |
| --- | --- |
| `useDataStreamController<TPart>()` | Stable `append`, `appendMany`, and `clear` commands |
| `useDataStreamAppend<TPart>()` | Stable `append` callback intended for `useChat({ onData })` |
| `useDataStreamStatus()` | Selective `{ pendingCount, hasPendingParts }` subscription |

`drain`, `subscribe`, `getSnapshot`, queue contents, batch generation, and `createDataStreamStore` remain private in v1. They are implementation seams, not consumer commands.

## AI SDK typing

The generic parameter is the consumer's **part union**, not its `UIDataTypes` map. This preserves the correlation between each `type` and its `data` payload:

```tsx
import type { DataUIPart } from "ai";
import {
  DataStreamController,
  type DataStreamPartHandler,
} from "@ai-sdk-agents/react";

type AgentDataParts = {
  id: string;
  title: string;
  textDelta: string;
  clear: null;
  finish: null;
};

type AgentDataPart = DataUIPart<AgentDataParts>;

function StreamIngress() {
  const append = DataStreamController.useAppend<AgentDataPart>();

  useChat<AgentUIMessage>({
    onData: append,
  });

  return null;
}

const handlePart: DataStreamPartHandler<AgentDataPart> = ({ part }) => {
  if (part.type === "data-title") {
    // part.data is string
  }
};

function App() {
  return (
    <DataStreamController.Root>
      <DataStreamController.Handler onPart={handlePart} />
      <StreamIngress />
    </DataStreamController.Root>
  );
}
```

Root is not generic. React context cannot soundly propagate a JSX generic from Root into arbitrary descendant hooks, and a generic Root prop with no runtime value would imply safety it cannot enforce. A Root owns one logical `TPart` union by convention; its Handler and ingress hooks use that same explicit type. A scoped `createDataStreamController<TPart>()` factory is deferred until real consumer code demonstrates that the repeated type argument is harmful.

## Delivery lifecycle

### Transition table

| Current | Event | Guard | Next | Effect |
| --- | --- | --- | --- | --- |
| idle | `append(part)` | — | pending | Enqueue part; publish new status snapshot |
| idle / pending | `appendMany(parts)` | non-empty | pending | Enqueue all parts atomically in input order; notify once |
| pending | Handler effect | queue non-empty | delivering | Atomically claim the whole queue as one immutable batch and expose an empty pending queue |
| delivering | `onPart` returns | — | delivering | Attempt next part in the claimed batch |
| delivering | `onPart` throws | — | delivering | Notify `onError` or retain first unhandled error; attempt next part |
| delivering | `append` / `appendMany` | — | delivering + pending | Enqueue into the next batch; never merge into current batch |
| delivering | `clear()` | — | delivering | Clear only the pending queue; current claimed batch continues |
| delivering | batch completes | pending queue empty | idle | Rethrow first unhandled error, if any |
| delivering | batch completes | pending queue non-empty | pending | Schedule the next post-commit drain |
| idle / pending | `clear()` | — | idle | Drop pending parts without delivery; notify only if state changed |
| any | Handler unmounts | — | idle / pending | Remove subscription; pending queue remains owned by Root |
| any | Root effect cleanup | — | inactive | Deactivate commands; hook subscriptions clean themselves up; do not clear the queue during Strict Mode replay |
| inactive | Strict Mode effect replay setup | same Root/store | idle / pending | Reactivate commands; preserve any unclaimed queue |

### Scheduling decision

V1 uses a normal React effect in Handler. It does not use `flushSync` or schedule its own microtask:

- React may coalesce a burst of appends into one batch.
- Handler claims the batch before calling consumer code.
- A notification caused while an effect is delivering schedules a later render and effect; it cannot mutate the claimed batch.
- Strict Mode's repeated effect setup sees an empty queue after the first claim, so it cannot redeliver that batch.

The package does not promise batch boundaries; only FIFO part ordering is public.

## ArtifactSession seam

The future adapter (working anatomy: `ArtifactSession.Stream`) composes the controller instead of expanding Handler props:

```tsx
<DataStreamController.Root>
  <ArtifactSession.Root>
    <ArtifactSession.Stream />
    <Chat />
  </ArtifactSession.Root>
</DataStreamController.Root>
```

`ArtifactSession.Stream` may render a DataStreamController Handler internally and own all of the following:

- recognition and application of `data-id/title/kind/clear/finish`;
- the artifact's initial state and kind-specific clear/reset value;
- lookup and invocation of a kind definition's stream handler;
- session status, visibility, metadata, and reducer ordering;
- any idempotency or retry strategy appropriate to session mutations.

This boundary is required by current evidence: most artifact Patterns interpret `data-clear` as `content: ""`, while the canvas Pattern resets to `EMPTY_WHITEBOARD_JSON`. The transport cannot supply a correct universal mutation.

## Multi-sink policy

V1 is one queue → one Handler → one `onPart` sink.

- Compose multiple side effects inside that one callback when they share one delivery attempt and ordering contract.
- Use separate Roots when consumers need independent queues or failure policy.
- Do not mount multiple Handlers under one Root.

A replayable event log with per-consumer cursors is a different primitive and is explicitly deferred.

## Invariants

1. A claimed batch is immutable and excludes later appends.
2. Parts are attempted in append order and at most once unless a consumer explicitly re-appends one.
3. Appending during delivery never loses or merges the new part into the current batch.
4. Clearing during delivery never cancels the current claimed batch.
5. Root children do not rerender merely because the queue changes.
6. Store snapshots remain referentially stable while their semantic status is unchanged.
7. Strict Mode setup/cleanup cannot redeliver a claimed batch.
8. The controller never interprets `data-*` payloads or mutates artifact state.
9. Unmount removes subscriptions; captured commands are inert while the store is inactive.

## Explicitly deferred

| Candidate | v1 default | Reconsider when |
| --- | --- | --- |
| Scoped `createDataStreamController<TPart>()` factory | Explicit generic on ingress/handler | Repeated types cause real DX or safety failures |
| Async `onPart` + acknowledgement | Sync, at-most-once attempt | A consumer needs backpressure or durable retry |
| Multiple Handlers / fan-out | One Handler | Independent consumers require replay cursors |
| Controlled / externally supplied store | Root-owned only | Host orchestration needs queue hydration or inspection |
| Manual `flush()` | Effect-driven only | Tests or non-React integrations need a supported imperative drain |
| Batch-complete event / generation | Omitted | A concrete telemetry or transaction use case appears |

## Interface acceptance

- [x] Domain contract names only behavior owned by the controller
- [x] Store versus context ownership is explicit
- [x] Common artifact deltas have one external owner
- [x] Generic strategy preserves `DataUIPart<TDataParts>` discrimination
- [x] Handler / ArtifactSession seam is explicit
- [x] Loading, delivery, completion, failure, retry, clear, and cleanup are defined
- [x] Transition table matches the proposed public commands
- [x] Deferred candidates have a v1 default and a reconsideration trigger
- [x] Maintainer approves and freezes the v1 names and semantics
