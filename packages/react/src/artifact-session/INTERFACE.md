# ArtifactSession — Interface

> **Status:** Frozen v1. Implemented against this surface. Sibling transport: [`../data-stream-controller/INTERFACE.md`](../data-stream-controller/INTERFACE.md).

## Domain contract

> This primitive maps ordered `data-*` parts (delivered through `DataStreamController.Handler`) into a **single-kind artifact document snapshot** so consumers share one envelope reducer and kind-specific content apply/clear without reimplementing stream wiring.

It is a session store + reducer, not a panel, editor, version history, or chat transport.

## Vocabulary

| Term | Meaning |
| --- | --- |
| **part** | Structural `DataStreamPart` (`type: \`data-${string}\``, required `data`, optional `id`) |
| **envelope** | Core-owned protocol: `data-id`, `data-title`, `data-kind`, `data-clear`, `data-finish` |
| **kind delta** | Any other `data-*` handled only by the session’s kind adapter |
| **streamPhase** | Core-owned `"idle" \| "streaming"` for the artifact stream, independent of chat status |
| **adapter** | Pure IoC object: `initialContent`, `clear`, `reducePart` for one `kind` |
| **Stream** | Part that mounts `DataStreamController.Handler` with `onPart → applyPart` (Handler renders `null`) |

## Design objectives

1. **Own the artifact envelope once** — Patterns stop cloning `id/title/kind/clear/finish` switches.
2. **Keep kind polymorphism in the adapter** — Especially clear/reset content (`""` vs empty scene JSON).
3. **Compose DSC, do not re-transport** — No public binder, drain, or second queue. `Stream` wraps Handler.
4. **Stay headless** — No Tailwind, icons, drawers, FLIP, editors, or semantic hosts in v1.
5. **High-frequency safe** — External store + selective selectors; content bursts must not wake unrelated selected slices into consumer rerenders.
6. **AI SDK–shaped without an `ai` runtime peer** — Same structural `DataStreamPart` philosophy as DSC.
7. **Fail loudly at the Handler seam** — Invalid envelope payloads and adapter throws leave state unchanged for that part and propagate to Handler `onError` / batch rethrow policy.
8. **Ship the smallest useful session** — Single document, single kind, uncontrolled store. Earn visibility/versions/metadata later.

## Non-goals (v1)

| Out of scope | Owner |
| --- | --- |
| FIFO queue / ordered drain | `DataStreamController` |
| Panel open/close, auto-open, Drawer, `boundingBox` | App / future `ArtifactPanel` |
| Versions, diff, persistence | App / future `DocumentVersionController` |
| Runtime metadata (Excalidraw API, consoles, tool UI) | App / kind UI |
| Multi-kind switching / adapter registry | Future design when a consumer exists |
| Field-wise controlled props | Future whole-store inject if needed |
| Chat / tools / `useChat` | App (`useAppend` at DSC boundary) |
| Styled registry Pattern chrome | Catalog / app |
| `ai` as install peer | DevDependency for dogfood/types only |
| Custom selector equality (`isEqual`) | Deferred until a real consumer needs it |

## Architecture decision

```text
Archetype:              Observer / controller (session store)
Composition:            DataStreamController.Root
                          CreatedSession.Root
                            CreatedSession.Stream   // wraps Handler
                            consumers…
Durable state:          Uncontrolled store in CreatedSession.Root
Native platform:        Structural DataStreamPart (no ai runtime peer)
Selected seams:         Pure reduce; one kind adapter; external store;
                        Stream → Handler.onPart; selective selectors;
                        imperative applyPart / setContent / reset
Rejected (v1):          visibility, versions, metadata, multi-adapter,
                        controlled fields, public binder / public store factory,
                        useRender hosts, styled panel, registration, SSR schema,
                        useSelector isEqual
SSR strategy:           Client session; hooks are client entries
Interaction model:      Stream delivery + consumer commands
Performance:            Stream deltas may be high-frequency → store + selectors
```

Nearest sibling rigor: DataStreamController (Handler / store), not Questionnaire.

## Public surface — v1 (frozen)

### Structural types

Import `DataStreamPart` and `DataStreamPartErrorHandler` from the sibling controller (same package). Do not redefine a divergent part or error shape.

```ts
import type {
  DataStreamPart,
  DataStreamPartErrorHandler,
} from "../data-stream-controller";

export type ArtifactStreamPhase = "idle" | "streaming";

export type ArtifactSessionState<K extends string = string> = {
  readonly documentId: string | null;
  readonly title: string;
  readonly kind: K;
  readonly content: string;
  readonly streamPhase: ArtifactStreamPhase;
};

export type ArtifactKindAdapter<
  TPart extends DataStreamPart,
  K extends string,
> = {
  readonly kind: K;
  initialContent(): string;
  clear(state: ArtifactSessionState<K>): string;
  /**
   * Kind deltas only. Envelope parts are never passed here.
   * Return next content, or null if this part is not handled.
   */
  reducePart(args: {
    part: TPart;
    state: ArtifactSessionState<K>;
  }): string | null;
};
```

### Factory (required typing seam)

```ts
export function createArtifactSession<
  TPart extends DataStreamPart,
  K extends string,
>(options: {
  adapter: ArtifactKindAdapter<TPart, K>;
}): ArtifactSessionNamespace<TPart, K>;

export type ArtifactSessionNamespace<
  TPart extends DataStreamPart,
  K extends string,
> = {
  Root: (props: ArtifactSessionRootProps) => React.JSX.Element;
  Stream: (props: ArtifactSessionStreamProps<TPart>) => React.JSX.Element;
  useSnapshot: () => ArtifactSessionState<K>;
  useSelector: <T>(selector: (state: ArtifactSessionState<K>) => T) => T;
  useController: () => ArtifactSessionController<TPart>;
};

export type ArtifactSessionRootProps = {
  children?: React.ReactNode;
};

export type ArtifactSessionStreamProps<TPart extends DataStreamPart> = {
  /** Forwarded to DataStreamController.Handler. */
  onError?: DataStreamPartErrorHandler<TPart>;
};

export type ArtifactSessionController<TPart extends DataStreamPart> = {
  applyPart(part: TPart): void;
  setContent(content: string): void;
  reset(): void;
};
```

There is **no** ambient `ArtifactSession = { Root, Stream, … }` singleton in v1. Callers bind one adapter:

```ts
export const TextArtifactSession = createArtifactSession({
  adapter: textAdapter,
});
```

`useSelector` uses `Object.is` via `useSyncExternalStore`. Consumers must select scalars or referentially stable values. There is no public `isEqual`.

### Anatomy

| Part / API | Host policy | Role |
| --- | --- | --- |
| `Root` | Provider only — **no DOM** | Owns store lifetime; context |
| `Stream` | Returns a `DataStreamController.Handler` element (that Handler renders `null`) | `onPart` → `applyPart` |
| `useSnapshot` | — | Whole-state subscription |
| `useSelector` | — | Selective subscription (`Object.is`) |
| `useController` | — | Stable commands |

**Composition (canonical)**

```tsx
const TextArtifactSession = createArtifactSession({ adapter: textAdapter });

function App() {
  return (
    <DataStreamController.Root>
      <TextArtifactSession.Root>
        <TextArtifactSession.Stream />
        <ChatIngress />
        <Panel />
      </TextArtifactSession.Root>
    </DataStreamController.Root>
  );
}

function ChatIngress() {
  const append = DataStreamController.useAppend<TextDataPart>();
  useChat({ onData: append });
  return null;
}

function Panel() {
  const content = TextArtifactSession.useSelector((s) => s.content);
  const streamPhase = TextArtifactSession.useSelector((s) => s.streamPhase);
  // …
}
```

`Stream` must sit under **both** `DataStreamController.Root` and the created session `Root`. Exactly one Handler per DSC Root remains the DSC rule — therefore exactly one `Stream` (or other Handler) per that Root.

Manual `applyPart` remains supported for tests and non-DSC ingress. There is **no** public `bindDataStream*`, `subscribeDrain`, or `createArtifactSessionStore`.

### Composition / race rules

**Local edits vs stream**

`setContent` commits immediately. A later stream delta may replace that content; ordering is last-write-wins.

**Additional stream consumers**

If one DSC Root must feed other side effects, omit `CreatedSession.Stream` and mount one custom `DataStreamController.Handler` that composes `applyPart` with those effects. That preserves DSC’s single-Handler invariant without expanding `Stream` props.

### Initial state

```ts
{
  documentId: null,
  title: "",
  kind: adapter.kind,
  content: adapter.initialContent(),
  streamPhase: "idle",
}
```

No magic `"init"` document id.

### Commands

| Command | Behavior |
| --- | --- |
| `applyPart(part)` | Pure reduce into store (also used by `Stream` / Handler). |
| `setContent(content)` | Local editor write. Does **not** change `streamPhase`. |
| `reset()` | Restore initial snapshot (`documentId: null`, empty title, adapter `initialContent()`, `streamPhase: "idle"`). |

No `open` / `close` / version / metadata / controlled props in v1.

### Root teardown (mirrors DataStreamController)

- Store begins **active** (pure tests and pre-effect commands work).
- Root effect setup **activates** the store.
- Effect cleanup **deactivates** without resetting state, preserving Strict Mode replay.
- Captured `applyPart`, `setContent`, and `reset` are **inert** while inactive.
- A real unmount leaves the store eligible for garbage collection.

## Envelope and transitions

### Payload strictness

| Part          | Required `data` |
| ------------- | --------------- |
| `data-id`     | `string`        |
| `data-title`  | `string`        |
| `data-kind`   | `string`        |
| `data-clear`  | `null`          |
| `data-finish` | `null`          |

Invalid envelope payloads **throw before commit**, leave the snapshot unchanged, and follow Handler `onError` / batch rethrow policy. Do **not** coerce with `String(data)`.

### Core-owned envelope

| Part | Guard | Next durable fields | `streamPhase` |
| --- | --- | --- | --- |
| `data-id` | `data` is `string`; see Identity | update id; may reset content/title | `"streaming"` |
| `data-title` | `data` is `string` | `title = data` | `"streaming"` |
| `data-kind` | `data` is `string` and `data === state.kind` | unchanged fields if ok | `"streaming"` |
| `data-kind` | string mismatch | **throw** (state unchanged) | unchanged |
| `data-clear` | `data === null` | `content = adapter.clear(state)`; id/title/kind unchanged | `"streaming"` |
| `data-finish` | `data === null` | unchanged content/identity | `"idle"` |
| other `data-*` | adapter returns `string` | `content = that string` | `"streaming"` |
| other `data-*` | adapter returns `null` | unchanged | unchanged |
| other `data-*` | adapter **throws** | unchanged for that part; error propagates | unchanged |

Rules:

- Envelope parts are **never** passed to `reducePart`.
- Adapters **cannot** set `streamPhase`. Whiteboard “scene ready” is app/content-derived, not session phase.
- Non-`data-*` values are outside this API (DSC typing should prevent them).
- Unknown kind parts that return `null` are silent no-ops.

### Identity

| Event | Behavior |
| --- | --- |
| `documentId === null` + `data-id` | Set `documentId = data`; `streamPhase = "streaming"`; content/title unchanged |
| same id again | Continue; `streamPhase = "streaming"` |
| **different** id | `documentId = newId`; `title = ""`; `content = adapter.initialContent()`; `streamPhase = "streaming"` |
| `data-clear` | Content reset only; **documentId unchanged** |

`initialContent()` (not `clear`) is the identity-reset content source so “new document” and “clear current document” can differ per kind if needed.

### `streamPhase` ownership

Flipped **only** by:

- envelope/delta presence that successfully applies → `"streaming"`
- `data-finish` → `"idle"`
- `reset()` → `"idle"`

Not flipped by `setContent`.

### Error policy

1. Reducer attempts a pure transition.
2. On throw before commit: store snapshot unchanged for that part.
3. Exception propagates to Handler (`Stream`’s `onPart`).
4. DSC `onError` / post-batch rethrow policy applies unchanged.
5. Do not swallow adapter or envelope validation errors inside `applyPart`.

## State taxonomy

| Kind | Fields |
| --- | --- |
| Durable | `documentId`, `title`, `kind`, `content`, `streamPhase` |
| Derived | Prefer consumer selectors in v1 |
| Render scalars for future adapters | `streamPhase`, `kind` only — do not put content into `data-*` |
| Ephemeral | none in core |
| Browser-owned | none |
| Not in core | visibility, versions, metadata, boundingBox, chat status |

## Accessibility & interaction

Core is a non-visual controller. No WAI-ARIA composite pattern.

| Input | Target | Expected | Session action | Native preserved? |
| --- | --- | --- | --- | --- |
| `useChat` `onData` | DSC `append` | enqueue | (via Stream) `applyPart` | n/a |
| Programmatic apply | tests | reduce | `applyPart` | n/a |
| Editor local write | app | update content | `setContent` | editor owns IME |
| Reset document | app | initial snapshot | `reset` | n/a |
| Screen reader busy | panel adapter | announce streaming | read `streamPhase` | adapter |

**N/A for core:** focus trap, roving tabindex, dialog, form serialization.

**Adapter guidance (README only):** when `streamPhase === "streaming"`, set `aria-busy` on the panel; do not steal focus on every delta.

## Invariants

1. One adapter / one `kind` / one document per Root lifetime (until `reset` or new id rules above).
2. `documentId === null` means “no id yet,” not invalid.
3. `streamPhase === "streaming"` means the artifact stream is open; chat status is independent.
4. `data-clear` never assumes `""` — always `adapter.clear`.
5. Identity change uses `adapter.initialContent()`, not a universal empty string.
6. Adapters never set `streamPhase`.
7. Equal selected snapshots skip **consumer rerenders** (`Object.is` via `useSyncExternalStore`). The underlying store may still notify every subscribed hook.
8. `applyPart` during React render is unsupported (effects/commands/Handler only).
9. Strict Mode remount does not invent duplicate logical documents by itself; store identity is Root-lifetime; deactivate does not reset state.
10. `Stream` does not claim DSC multi-Handler support — one Handler/Stream per DSC Root.
11. Envelope payloads are strictly typed at runtime (`string` / `null` as specified); invalid payloads throw before commit.

## Dependencies & package

| Item | v1 |
| --- | --- |
| Peer | `react` (same range as package) |
| Sibling types/components | `DataStreamPart`, `DataStreamPartErrorHandler`, `DataStreamController.Handler` |
| `ai` | **devDependency** for dogfood / type compatibility only |
| Public binder | **none** |
| `"use client"` | Required on React entry files; verify postbuild |

Export path: `@aisdkagents/react` barrel and `@aisdkagents/react/artifact-session`.

## Explicitly deferred

| Candidate | v1 default | Reconsider when |
| --- | --- | --- |
| Visibility / auto-open | App | Panel adapter shares open rules across Patterns |
| Versions / diff | App | Shared commit/nav rules proven in ≥2 Patterns |
| Metadata | App | Kind UI needs session-owned bag, not local state |
| Multi-kind session | Rejected | A real consumer streams multiple kinds into one panel |
| Controlled store | Uncontrolled only | Host must hydrate/replace whole snapshot |
| Public store factory | Private | Non-React host needs the same reducer |
| `contentStatus` / readiness | App parse of `content` | Whiteboard/etc. need shared readiness enum |
| Ambient non-factory namespace | Factory only | DX pain from repeating `createArtifactSession` |
| `useSelector(isEqual)` | `Object.is` only | A concrete consumer needs deep/custom equality |

## Dogfood exit criteria (v1)

1. **Text:** `id → title → kind → clear → textDelta×N → finish` → idle; clear uses `""`; selector isolation under burst (title selector does not rerender on content-only deltas).
2. **Whiteboard:** clear → empty scene JSON; deltas update content; `streamPhase` stays `"streaming"` until `data-finish` even if UI treats scene as ready.
3. **Identity:** second different `data-id` resets content + clears title; `data-clear` does not change id.
4. **Kind mismatch / invalid envelope:** wrong `data-kind` or non-string/`non-null` envelope payload throws; state unchanged; Handler `onError` observes when provided.
5. **Adapter throw on delta:** state unchanged for that part; Handler error policy applies.
6. **Composition:** ingress is DSC `append` / Handler only — no invented drain API.
7. **Teardown:** Strict Mode replay preserves session state; captured commands are inert after Root unmount deactivate.

## Interface acceptance

- [x] Domain sentence names only session-owned behavior
- [x] DSC Handler seam via `Stream` (no public binder)
- [x] State = five fields; `streamPhase` core-owned (not `status`)
- [x] Identity = `null` + same/different id rules
- [x] One adapter via `createArtifactSession` (no ambient singleton)
- [x] Strict envelope payloads; throws propagate; no swallow
- [x] No `ai` runtime peer
- [x] No visibility / versions / metadata / controlled / binder / `isEqual` in this freeze
- [x] `Stream` return type is `React.JSX.Element`; reuses `DataStreamPartErrorHandler`
- [x] Root activate/deactivate lifecycle documented
- [x] Local-edit vs stream and multi-sink composition rules documented
- [x] Maintainer approves names (`streamPhase`, factory namespace)
- [x] DSC INTERFACE “ArtifactSession seam” updated to document fields + `streamPhase` only

## Resolved decisions (locked)

| # | Decision |
| --- | --- |
| 1 | Single document, single kind |
| 2 | Different `data-id` → `initialContent()` + `title = ""` |
| 3 | Visibility deferred |
| 4 | Versions deferred |
| 5 | No controlled fields |
| 6 | `setContent` allowed anytime; does not touch `streamPhase`; LWW vs later deltas |
| 7 | Adapter cannot override phase |
| 8 | Structural parts; `ai` not a peer |
| 9 | No public binder; `Stream` wraps Handler |
| 10 | Public field is `streamPhase`, not Pattern `status` / `isVisible` |
| 11 | Factory-created namespace, not ambient singleton |
| 12 | `useSelector` is `Object.is` only — no `isEqual` |

---

_End of ArtifactSession INTERFACE v1 freeze._
