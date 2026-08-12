# AI SDK Agents

Public monorepo for **headless React primitives** and a **shadcn registry** for AI SDK agent UIs.

| Item | Value |
| --- | --- |
| GitHub | [`nolly-studio/ai-sdk-agents`](https://github.com/nolly-studio/ai-sdk-agents) |
| npm scope | `@ai-sdk-agents` |
| First package | `@ai-sdk-agents/react` |
| First primitive | DataStreamController |

This is **not** Midday’s `@ai-sdk-tools/*`. The unscoped npm name `ai-sdk-agents` is taken — use the scoped packages only.

## Why this repo exists

The product catalog (Patterns / pro blocks) stays in a **private** monorepo. Publishing primitives from that tree risks leaking paid source. This public repo is the home for `@ai-sdk-agents/*` and the public registry. The private catalog will consume the published package later.

## npm vs registry

| Path | What you get |
| --- | --- |
| **npm** `@ai-sdk-agents/react` | Canonical headless behavior (Root / Handler / hooks). Prefer this for apps. |
| **shadcn registry** | Composition / docs examples that depend on the npm package (model **C**). Copy-in ownership of the demo, not a second controller API. |

Do not put private Pattern apps in this registry.

### Install (npm) — after M6 publish approval

```bash
pnpm add @ai-sdk-agents/react
```

The package is still `"private": true` / `0.0.0` until an explicit release OK.

### Install (registry)

Build locally:

```bash
pnpm registry:build
```

JSON lands in `apps/web/public/r/`. After the docs site is deployed:

```bash
npx shadcn@latest add https://<your-deployed-host>/r/data-stream-controller-demo.json
```

Or, once the GitHub repo is public, follow [shadcn GitHub registries](https://ui.shadcn.com/docs/registry/github) using this repo’s root `registry.json`.

## Monorepo layout

```text
apps/web/                 # docs + registry host (public/r)
packages/react/           # @ai-sdk-agents/react
packages/ui/              # shared UI for the docs app
registry/                 # registry item sources
registry.json             # shadcn registry entrypoint
```

## Development

```bash
pnpm install
pnpm check            # ultracite (oxlint + oxfmt)
pnpm typecheck
pnpm test
pnpm build
pnpm build:packages   # packages/* only (no docs app)
pnpm verify:publish
pnpm registry:build
pnpm --filter web dev
```

Lint/format: [Ultracite](https://www.ultracite.ai/) with Oxlint + Oxfmt (`pnpm check` / `pnpm fix`). Husky runs fix on pre-commit.

Package-scoped:

```bash
pnpm --filter @ai-sdk-agents/react typecheck
pnpm --filter @ai-sdk-agents/react test
pnpm --filter @ai-sdk-agents/react build
pnpm --filter @ai-sdk-agents/react verify:publish
```

## DataStreamController

Frozen v1 contract: `packages/react/src/data-stream-controller/INTERFACE.md`.

- One Handler per Root; FIFO claim-before-dispatch
- No public drain / subscribe / store
- Common artifact deltas are **not** applied here — future `ArtifactSession`
- No `ai` peer dependency; React `^19` peer
- `"use client"` restored post-tsup via `scripts/ensure-use-client.mjs`

Docs: [/docs/data-stream-controller](./apps/web/app/docs/data-stream-controller)

## Out of scope

- Private catalog Pattern migration
- ArtifactSession / DocumentVersionController / HITL controllers (future)
- `npm publish` without human M6 approval
