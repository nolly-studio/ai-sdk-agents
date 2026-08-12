# Handoff prompt — `nolly-studio/ai-sdk-agents` (public shadcn registry monorepo)

Copy this entire prompt to the agent working in the **new public repo**. The human will copy relevant source files from the private catalog monorepo; you must scaffold the destination like a **shadcn-style monorepo + registry**, then integrate the copied primitive work.

---

## Prompt (paste below)

````text
You are setting up a NEW public GitHub repository for AISDK Agents headless React
primitives, modeled on the shadcn monorepo / registry style.

## Goals

1. Create a public monorepo named approximately `ai-sdk-agents`
   (GitHub: `nolly-studio/ai-sdk-agents`).
2. Structure it like shadcn’s monorepo: apps + packages + registry build pipeline,
   pnpm workspaces, turborepo (or equivalent), not a single flat package dump.
3. Expose installable artifacts via a **shadcn registry** (registry JSON that
   `npx shadcn@latest add …` can consume), in addition to (or staged toward) the
   npm package `@ai-sdk-agents/react`.
4. Integrate the already-built DataStreamController primitive the human copies in
   from a private catalog monorepo. Do not invent a second stream controller API.
5. Keep this repo free of paid Pattern / pro-block application source from the
   private catalog. Headless primitives + docs + registry examples only.

## Why a separate repo

The product catalog monorepo (private) must stay fully private. Publishing
primitives from that repo risks leaking paid source and couples npm to a private
tree. This public repo is the home for `@ai-sdk-agents/*` and the public registry.

## Package / naming

| Item | Value |
|------|--------|
| Repo | `nolly-studio/ai-sdk-agents` |
| npm scope | `@ai-sdk-agents` |
| First package | `@ai-sdk-agents/react` |
| First primitive | DataStreamController (observer/controller) |
| Unscoped `ai-sdk-agents` on npm | TAKEN — do not use unscoped |
| Midday `@ai-sdk-tools/*` | UNRELATED — do not collide or impersonate |

## What the human will copy over

Expect roughly these paths from the private repo’s `packages/react/` (names may
vary slightly after copy):

- `src/` — full DataStreamController implementation + dogfood fixtures/tests
- `src/data-stream-controller/INTERFACE.md` — **frozen v1 contract** (authoritative)
- `src/data-stream-controller/PLAN.md` — milestones; M1–M5 done in private tree
- `package.json`, `tsup.config.ts`, `tsconfig*.json`, `vitest.config.ts`, `vitest.setup.ts`
- `scripts/ensure-use-client.mjs`, `scripts/verify-publish.mjs`
- `README.md`, `PUBLISH.md`, this `HANDOFF.md`

Treat INTERFACE.md as frozen. Do not reopen common-delta ownership, multi-Handler
fan-out, or ArtifactSession-inside-controller debates unless the human asks.

## Frozen public API (do not drift)

```ts
export const DataStreamController = {
  Root,
  Handler,
  useController,
  useAppend,
  useStatus,
}

// Handler
{ onPart: (event: { part: TPart }) => void; onError?: (event: { cause: unknown; part: TPart }) => void }

// Commands
{ append; appendMany; clear }

// Types
DataStreamPart = { type: `data-${string}`; data: unknown; id?: string }
DataStreamStatus = { pendingCount; hasPendingParts }
````

- One Handler per Root; FIFO claim-before-dispatch; no public drain/subscribe/store.
- Common artifact deltas (`data-id/title/kind/clear/finish`) are NOT applied here; a future ArtifactSession adapter owns that.
- No `ai` peer dependency; structural types only (`ai` may be a devDependency for tests).
- React `^19` peer.
- `"use client"` must survive the build (tsup/esbuild strips it — post-build `ensure-use-client.mjs` is required; verify in publish checks).

## Target monorepo shape (shadcn-style)

Adapt freely, but aim for something like:

```text
ai-sdk-agents/
  apps/
    www/                 # docs + registry site (or v4-style app)
  packages/
    react/               # @ai-sdk-agents/react (copied primitive)
    # later: more packages if needed
  registry/              # registry item sources OR generated from packages
  pnpm-workspace.yaml
  turbo.json             # if using turborepo
  package.json
  README.md
```

Requirements for the registry side:

- Follow shadcn registry conventions: items with name, type, files, dependencies, registryDependencies as needed.
- Prefer distributing **source** via registry (shadcn model) while still keeping a proper buildable `@ai-sdk-agents/react` package for npm consumers.
- Decide explicitly and document: A) registry items wrap/install the npm package, or B) registry items ship the headless source files directly, or C) both (npm for apps that want a dependency; registry for copy-in ownership). Default recommendation: **C** — npm package is canonical behavior; registry offers a styled or composition example that depends on / documents the package.
- Do not put private pro-block Pattern apps into this registry.

## Implementation status already completed (private tree)

- M1: Interface freeze + scaffold alignment (`onPart` / `onError`)
- M2: Pure FIFO store + `deliverBatch` + unit tests
- M3: React Root/Handler/hooks + Strict Mode / render-count tests
- M4: Internal dogfood fixture (agent-text shaped `DataUIPart` sink)
- M5: tsup build, `"use client"` restore, `verify:publish` clean-consumer pack test
- Still `private: true` / version `0.0.0` — first public publish is a separate gate

You should re-home that work, make CI green in the new repo, wire registry + docs, and prepare for an explicit first npm release (do not publish without human OK).

## Your tasks (in order)

1. Scaffold the public monorepo (pnpm workspaces, apps/www or docs app, packages/).
2. Place the copied `packages/react` content into `packages/react`.
3. Fix package metadata:
   - `repository.url` → `https://github.com/nolly-studio/ai-sdk-agents`
   - remove `directory` or set correctly
   - keep `private: true` until human approves publish
4. Make `pnpm install`, `typecheck`, `test`, `build`, `verify:publish` work from root via package filters/turbo.
5. Add a shadcn registry pipeline:
   - at least one registry item for DataStreamController (docs example / usage)
   - registry build script producing valid registry JSON
   - document install: `npx shadcn@latest add <registry-url>/…`
6. Add minimal docs page explaining anatomy: Root + Handler + useAppend + onPart sink; ArtifactSession is future/out of scope.
7. Add CI (GitHub Actions): install, test, build, registry build.
8. Update README with: what this repo is, npm vs registry, relationship to aisdkagents.com private catalog (consumes published package later).
9. Do NOT migrate private Pattern blocks. Do NOT implement ArtifactSession unless asked.
10. Stop before `npm publish` / removing `private: true` unless the human explicitly approves release.

## Quality bar

- Headless-primitives skill mindset: behavior package, no Tailwind in the primitive.
- Ultracite/Biome or project lint if you add it — match shadcn-quality TypeScript.
- Preserve tests (store, dispatch, components, dogfood).
- Preserve publish verification for `"use client"` and clean-consumer imports.

## Out of scope

- Private catalog Pattern migration (`agent-text-artifact`, etc.)
- Eve agents, Stripe, entitlements, pro-registry auth
- ArtifactSession / DocumentVersionController / HITL controllers (future packages)
- Renaming away from `@ai-sdk-agents/react` without human approval

## Definition of done

- [ ] Public monorepo boots with pnpm
- [ ] `@ai-sdk-agents/react` typechecks, tests, builds
- [ ] `"use client"` present on built public entries
- [ ] `verify:publish` passes
- [ ] At least one shadcn registry item builds and is documented
- [ ] README explains npm + registry install paths
- [ ] CI green
- [ ] Still not published until human says M6/go

## Authoritative docs (in the copied tree)

- `packages/react/src/data-stream-controller/INTERFACE.md`
- `packages/react/src/data-stream-controller/PLAN.md`
- `packages/react/PUBLISH.md`

````

---

## Files to copy from private monorepo

From `packages/react/` (recommended set):

```text
src/
package.json
tsup.config.ts
tsconfig.json
tsconfig.build.json   # optional if tsup-only
vitest.config.ts
vitest.setup.ts
scripts/
README.md
PUBLISH.md
HANDOFF.md            # this file
````

Optional: leave `PLAN.md` / `INTERFACE.md` inside `src/data-stream-controller/` as copied — they are the contract.

Do **not** copy private catalog Patterns, `apps/v4`, Stripe, or pro-registry auth into the public repo.
