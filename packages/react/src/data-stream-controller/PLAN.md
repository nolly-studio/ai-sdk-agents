# DataStreamController — Plan

> **Plan status:** Interface frozen. M1–M6 complete (`@aisdkagents/react@0.1.0`). Next: M7 Pattern migration in the private catalog.

## Why this primitive

Seven representative AISDK Agents artifact Patterns clone the same client bridge:

- `data-stream-provider.tsx` stores `DataUIPart[]` in React context;
- `useChat({ onData })` appends with a React state update per part;
- `data-stream-handler.tsx` snapshots and clears the array in an effect;
- each handler invokes kind behavior and repeats the artifact mutation switch.

Representative families:

- `agent-text-artifact`
- `agent-code-artifact`
- `agent-map-artifact`
- `agent-mermaid-artifact`
- `agent-sheet-artifact`
- `agent-slides-artifact`
- `agent-canvas-draw-artifact`

Related `@ai-sdk-tools/artifacts` Patterns are a separate orchestration stack and are not forced into v1.

### Evidence that shapes the boundary

The provider/queue/effect behavior is genuinely common. Artifact mutation is not:

- `data-id`, `data-title`, `data-kind`, `data-clear`, and `data-finish` mutate the Pattern-local `UIArtifact` model;
- kind-specific `onStreamPart` functions receive React artifact and metadata setters;
- canvas interprets `data-clear` as `EMPTY_WHITEBOARD_JSON`, while the other sampled Patterns use an empty string.

Therefore v1 extracts only ordered delivery. A future `ArtifactSession` stream adapter removes the duplicated artifact reducer without contaminating the transport primitive.

## Domain model

### Contract

DataStreamController manages FIFO buffering and ordered delivery of AI SDK UI data parts so consumers can connect `useChat({ onData })` to one stream sink without reimplementing provider, queue, and drain-effect plumbing.

### Source of truth

| Before | After |
| --- | --- |
| Pattern-local React `DataUIPart[]` state | Root-owned external FIFO store |
| Changing context value contains the full array | Stable context value contains the store/API reference |
| Pattern effect owns snapshot and clear | DataStreamController Handler owns snapshot and delivery |
| Pattern handler owns artifact semantics | Consumer now; future `ArtifactSession` adapter later |

There is one new transient source of truth: the Root's pending queue. There is no second controlled copy and no persisted controller state.

### States

| State | Meaning |
| --- | --- |
| `idle` | Pending queue is empty; no batch is being delivered |
| `pending` | One or more parts await Handler |
| `delivering` | Handler synchronously attempts one immutable claimed batch; a separate next queue may also be pending |
| `inactive` | Root effect cleaned up; commands are inert until Strict Mode replay reactivates the same store or it is garbage-collected |

Derived, not independently stored: `pendingCount` and `hasPendingParts`.

### Events and effects

| Event | Owner | Effect |
| --- | --- | --- |
| `append` | Consumer / `useChat onData` | Enqueue one part; notify status subscribers |
| `appendMany` | Consumer | Enqueue one atomic ordered group; notify once |
| effect drain | Handler | Claim pending queue, then attempt each part |
| `clear` | Consumer | Drop only unclaimed parts |
| part failure | Handler | Notify `onError` or retain first error; continue batch |
| Handler unmount | React | Unsubscribe; Root queue survives |
| Root effect cleanup | React | Deactivate commands; hook subscriptions clean themselves up |

The full transition table and callback ordering are authoritative in `INTERFACE.md`.

### Failure and retry

- Delivery is a synchronous, at-most-once **attempt**, not an exactly-once side effect guarantee.
- The queue is claimed before consumer code runs, preserving concurrent appends.
- A thrown `onPart` does not block later parts in the same batch.
- `onError` may explicitly re-append only when the consumer's mutation is idempotent. No automatic retry is safe because a callback can partially mutate before throwing.
- Without `onError`, Handler rethrows the first captured error after attempting the full batch.
- Async handlers, acknowledgement, backpressure, and durable retry are out of scope for v1.

### Lifecycle cleanup

- Appends before Handler mounts remain queued and drain after it mounts.
- Handler unmount removes only its subscription; remount can drain pending work.
- Root effect cleanup deactivates captured commands; hook subscriptions remove their own listeners.
- Cleanup does not clear the queue because Strict Mode replays effects on the same mounted store. Replay setup reactivates it; a real unmount leaves the inactive store eligible for garbage collection.
- Captured commands while inactive are no-ops.
- Strict Mode's second effect setup sees no already-claimed parts.

## Architecture selection

| Decision | Selection | Rationale |
| --- | --- | --- |
| Primary archetype | Observer / controller | High-frequency external ingress with imperative commands |
| Queue | External store from v1 | Prevent Root subtree rerenders on every streamed part |
| Context | Stable store/API reference only | Tree scoping without transporting changing data |
| Selective React state | `useSyncExternalStore` status hook | Rerender Handler/status readers only |
| Composition | Root + one null Handler | Handler can live where sink context is available |
| Scheduling | Normal React effect, synchronous batch | Matches current lifecycle without `flushSync` or custom microtasks |
| Controlled state | Rejected for v1 | Queue is transient delivery bookkeeping, not app-owned durable state |
| Public drain/store | Rejected for v1 | Would expose snapshot and subscription machinery consumers need not own |
| Registration | Rejected | Exactly one Handler; no dynamic capability collection |
| SSR schema | Rejected | No server-side stream queue or descendant-derived HTML |
| Host rendering / `data-*` | Rejected | Root is provider-only and Handler renders `null` |

## Public interface plan

The frozen v1 surface is fully specified in `INTERFACE.md`:

```ts
DataStreamController.Root;
DataStreamController.Handler;
DataStreamController.useController;
DataStreamController.useAppend;
DataStreamController.useStatus;
```

Public controller commands are only `append`, `appendMany`, and `clear`. Handler requires `onPart` and optionally accepts `onError`. The generic is the consumer's exact structural part union—typically `DataUIPart<TDataParts>`—rather than a Root-level `TDataParts` map.

### Handler / ArtifactSession seam

DataStreamController Handler owns:

- claiming an immutable queue snapshot;
- FIFO delivery attempts;
- concurrent-append isolation;
- failure observation and lifecycle cleanup.

The ArtifactSession adapter owns:

- `id/title/kind/clear/finish` recognition and mutation;
- initial state and reset representation;
- one kind adapter for kind-specific clear/delta handling;
- document fields and core-owned `streamPhase` only (v1).

Visibility, versions, and metadata are deferred beyond ArtifactSession v1. The adapter consumes Handler via `ArtifactSession.Stream` instead of adding setters or artifact flags to Handler.

## Proposed implementation seams

```text
data-stream-controller/
  INTERFACE.md
  PLAN.md
  README.md
  types.ts                         # public structural types and commands
  store.ts                         # private pure FIFO store + stable snapshot
  dispatch.ts                      # private per-batch attempt/error policy
  context.tsx                      # scoped stable store context + guard
  use-data-stream-controller.ts    # commands, append, and status hooks
  components.tsx                   # thin Root + null Handler
  index.ts                         # intentional namespace and public types
  store.test.ts
  dispatch.test.ts
  components.test.tsx
  exports.test.ts
```

`getCommonDeltaType`, `DataStreamDispatchContext`, `applyCommonDeltas`, public `drain`, and public `subscribe` from the pre-hone scaffold were removed in M1; they no longer match the selected boundary. Store claim/subscribe and `deliverBatch` remain private implementation seams.

## Implementation sequence

### M1 — Freeze and align the scaffold

- Maintainer approves public names and delivery/error semantics.
- Update scaffold types, props, namespace exports, and README examples.
- Remove pre-hone common-delta and public-store concepts.
- Keep `ai` only as a development dependency for compatibility type tests; the structural v1 interface does not require an AI SDK peer dependency.
- Exit: source declarations match `INTERFACE.md`; behavior still throws.

### M2 — Pure store and delivery

- Implement one Root-lifetime FIFO store with stable command functions.
- Keep status snapshots referentially stable when their meaning is unchanged.
- Implement atomic `appendMany` and claim-before-dispatch.
- Implement per-part error isolation and post-batch rethrow policy.
- Exit: pure tests cover all domain transitions and failure branches.

### M3 — React Root, hooks, and Handler

- Root creates one store per mounted lifetime and deactivates/reactivates it in a Strict Mode-safe effect lifecycle.
- Context contains only the stable store reference.
- `useStatus` and Handler subscribe with `useSyncExternalStore`.
- Handler drains in a normal effect and reads the latest callbacks safely.
- Exit: DOM tests cover mount timing, Strict Mode, callback replacement, clear, unmount/remount, and unrelated-child render counts.

### M4 — Internal consumer dogfood

- Add a non-published consumer fixture with an exact `DataUIPart<TDataParts>` union and a Pattern-shaped sink adapter.
- Exercise the real Root, Handler, `useAppend`, and `useChat onData`-compatible callback boundary without changing installable registry source.
- Compare ordered updates, clear, finish, and failure behavior with the characterized Pattern clones.
- Exit: the public package interface—not private store hooks—supports the full representative ingress flow.

### M5 — Publish preparation

- Build declarations and runtime entries.
- Verify package root and subpath imports from a minimal consumer.
- Inspect built hook-using entries for preserved `"use client"` directives.
- Confirm React peer range, AI SDK type compatibility, package `files`, exports, ESM policy, and `sideEffects`.
- Exit: publish checklist passes; only then remove `private: true` in a separate release decision.

### M6 — Release package

- Confirm `@aisdkagents/react` is still available and package metadata points at the intended repository.
- Remove `private: true`, create the release artifact, and verify the exact npm version resolves from a clean consumer.
- Exit: a pinned, installable npm version exists. Publishing is a separate maintainer-approved action, not implied by this implementation plan.

### M7 — Migrate one registry Pattern

- Only after M6, add the pinned package dependency to `agent-text-artifact` and replace its local provider/handler with a Pattern-local sink adapter.
- Compare streamed behavior against the characterization tests.
- Run registry dependency/file-closure checks and rebuild generated registry data.
- Exit: a clean external Pattern install resolves the package and preserves behavior; no local data-stream provider/handler clone remains in that Pattern.

## Follow-on: ArtifactSession

ArtifactSession is a separate primitive and plan, not a condition for releasing DataStreamController. Its plan should:

- consume Handler's `onPart` seam;
- own `id/title/kind/clear/finish` plus kind-specific dispatch;
- encode clear/reset per artifact kind;
- test reducer ordering and session-specific retry/idempotency;
- prove the boundary with a non-string reset such as the canvas document.

## Test plan

| Layer | Required cases |
| --- | --- |
| Pure store | append; atomic appendMany; empty appendMany no-op; FIFO claim; clear; stable snapshots; notify counts; unsubscribe; deactivate/reactivate |
| Concurrency | append during delivery goes to next batch; clear during delivery affects next queue only; re-append from `onError` survives |
| Dispatch | ordered attempts; thrown handler does not block later parts; handled error; unhandled post-batch rethrow; no automatic retry |
| React | append through hook; queued before Handler mount; exactly one drain; latest callback; Handler unmount/remount; Root teardown |
| Strict Mode | no double delivery; idempotent subscribe cleanup; no retained listeners |
| Performance | unrelated Root child render count remains unchanged during a representative burst; Handler/status readers update only as needed |
| Types | exact `DataUIPart<TDataParts>` union accepted; `type` narrows `data`; non-`data-*` parts rejected; shared Root convention documented |
| Package | typecheck; declarations; package/root subpath imports; client directive inspection; intentional export audit |
| Dogfood | internal public-API consumer matches characterized ordering, clear, finish, and failure behavior |

### Not applicable in v1

- Real-browser focus, keyboard, form, and observer tests: no DOM host or browser interaction exists.
- SSR/hydration collection tests: no server queue or SSR-derived state exists.
- Controlled acceptance/rejection tests: the queue is intentionally uncontrolled.
- Render-prop and registration tests: neither seam is public.
- Styled-adapter tests: no styled adapter is requested.

## Migration sketch

```tsx
import type { DataUIPart } from "ai";
import {
  DataStreamController,
  type DataStreamPartHandler,
} from "@aisdkagents/react";

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

The first registry migration intentionally keeps the Pattern-local artifact reducer. M4 proves transport behavior without making a private workspace package a customer dependency; M7 migrates the Pattern only after npm resolution is verified. Artifact semantics move later under the separate ArtifactSession plan.

## Package and namespace

| Item | Decision |
| --- | --- |
| Package | `@aisdkagents/react` |
| Workspace path | `packages/react` |
| Public subpath | `@aisdkagents/react/data-stream-controller` |
| React | Peer dependency; v1 implementation targets React 19 |
| AI SDK | Structural public part type; no peer/runtime dependency in v1; `ai` dev dependency for type tests |
| Publish state | Public as of `0.1.0` (M6) |

The scope matches AISDK Agents. Unscoped `ai-sdk-agents` is taken, and Midday's already-used `@ai-sdk-tools/*` ecosystem is unrelated.

## Review gates

### Stop before M2 if

- the maintainer wants common artifact deltas in controller core;
- multiple independent Handlers per Root are a v1 requirement;
- asynchronous delivery or automatic retry is required;
- a Root-level type factory is required for interface freeze.

Any of those changes the queue or ownership model and requires revisiting `INTERFACE.md`, not a local implementation patch.

### Interface acceptance

- [x] Domain contract and source of truth are explicit
- [x] State, events, transitions, effects, failure, retry, and cleanup are covered
- [x] Selected and rejected architectural seams are recorded
- [x] Public surface is smaller than the behavior it hides
- [x] Common-delta and ArtifactSession ownership is resolved
- [x] Test layers and non-applicable layers are named
- [x] Migration and package verification have exit criteria
- [x] Maintainer approves interface freeze

## Current scaffold status

- [x] Workspace and package skeleton
- [x] DataStreamController folder and throwing behavior stubs
- [x] Interface hone pass
- [x] Implementation plan reconciled to the honed surface
- [x] Interface freeze approval (M1)
- [x] Scaffold declarations aligned to approved interface (M1)
- [x] Pure store + deliverBatch + unit tests (M2)
- [x] React Root, hooks, Handler + DOM tests (M3)
- [x] Internal consumer dogfood (M4)
- [x] Publish preparation (M5): dist build, `"use client"`, clean-consumer verify
- [x] Approved npm release (M6): `@aisdkagents/react@0.1.0`
- [ ] First registry Pattern migration (M7)
- [ ] Separate ArtifactSession plan and adapter
