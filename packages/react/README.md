# `@ai-sdk-agents/react`

Headless React primitives for AI SDK agent UIs.

This package owns **behavior** (stream bridging, and later artifact sessions / HITL controllers). Styled adapters and paid Pattern demos live in the private catalog — not this public repo.

## Status

Private. First primitive: **DataStreamController** — M1–M5 complete (build + publish verification). Not published until M6 is explicitly approved.

## Install

```bash
# After M6 publish approval
pnpm add @ai-sdk-agents/react

# Workspace (this monorepo)
pnpm --filter @ai-sdk-agents/react build
pnpm add @ai-sdk-agents/react --filter=web
```

Composition example via shadcn registry (depends on this package):

```bash
npx shadcn@latest add https://<your-deployed-host>/r/data-stream-controller-demo.json
```

## Primitives

| Primitive | Archetype | Path | Status |
| --- | --- | --- | --- |
| DataStreamController | observer / controller | [`src/data-stream-controller`](./src/data-stream-controller) | M1–M5 done; private until M6 |

## Development

```bash
pnpm --filter @ai-sdk-agents/react typecheck
pnpm --filter @ai-sdk-agents/react test
pnpm --filter @ai-sdk-agents/react build
pnpm --filter @ai-sdk-agents/react verify:publish
```

See [`PUBLISH.md`](./PUBLISH.md) for the M5 checklist and M6 release gate.

## Scope

Package name `@ai-sdk-agents/react` matches the AISDK Agents product. The unscoped npm name `ai-sdk-agents` is taken; this scoped package was available when scaffolded.

Not the same as Midday’s `@ai-sdk-tools/*` packages.
