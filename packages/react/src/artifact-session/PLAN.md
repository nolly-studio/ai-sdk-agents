# ArtifactSession — Plan

> **Plan status:** Interface frozen. M1–M5 complete in this package. M6 (catalog migration) is private-repo follow-up. Do not reopen the longer multi-concern research plan unless catalog migration produces concrete evidence for a deferred concern.

## Why this primitive

Artifact Patterns clone the same envelope reducer (`data-id/title/kind/clear/finish`) and kind-specific clear/delta rules. DataStreamController already owns FIFO delivery. ArtifactSession owns the document snapshot.

## Boundary

| Owner                  | Concern                                      |
| ---------------------- | -------------------------------------------- |
| `DataStreamController` | Queue, Handler delivery, `onError`           |
| `ArtifactSession`      | Envelope + single-kind content/`streamPhase` |
| Kind adapter           | `initialContent` / `clear` / `reducePart`    |
| App / catalog          | Panel, versions, metadata, chat, editors     |

## Implementation sequence

### M1 — Pure reducer

- `types.ts`, `state.ts`
- Envelope strictness, identity, finish, clear, kind mismatch
- Exit: `state.test.ts` green

### M2 — Private store

- Activate/deactivate, inert commands, snapshot notify
- Exit: `store.test.ts` green

### M3 — Factory Root / Stream / hooks

- `createArtifactSession`
- `Stream` → `DataStreamController.Handler`
- `useSnapshot` / `useSelector` (`Object.is`) / `useController`
- Strict Mode + unmount command inertness
- Exit: `components.test.tsx` green

### M4 — Fixtures

- Text adapter dogfood (append or replace — fixture documents choice; Patterns append)
- Whiteboard clear JSON + phase until finish
- Exit: fixture tests green

### M5 — Package wiring

- Subpath export, barrel, tsup entry, `"use client"` ensure, verify-publish allowlist
- Short README
- Exit: `pnpm typecheck && pnpm test && pnpm build && pnpm verify:publish`

### M6 — Catalog migration (private repo)

- One Pattern first (`agent-text-artifact`), then whiteboard asymmetry
- Out of scope for this public package PR unless the catalog lives here

## Module layout

```text
artifact-session/
  INTERFACE.md
  PLAN.md
  README.md
  types.ts
  state.ts
  store.ts
  create-artifact-session.tsx
  index.ts
  state.test.ts
  store.test.ts
  components.test.tsx
  fixtures/
    agent-text-session/
    agent-whiteboard-session/
```

## Anti-scope during implementation

Do not add visibility, versions, metadata, controlled props, multi-adapter Root, `isEqual`, public store factory, or a public binder.
