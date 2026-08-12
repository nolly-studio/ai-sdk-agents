# Publish checklist — `@ai-sdk-agents/react`

## Metadata

- [x] Package name: `@ai-sdk-agents/react`
- [x] `"type": "module"`
- [x] `"sideEffects": false`
- [x] `files` publishes `dist` + `README.md` (not `src`, fixtures, or tests)
- [x] React `^19` peer dependency
- [x] No `ai` peer/runtime dependency (structural types; `ai` is a devDependency)
- [x] Root + `./data-stream-controller` exports point at `dist`
- [x] `publishConfig.access`: `public`
- [x] M6: `private` removed; version `0.1.0`

## Build artifact

- [x] `pnpm --filter @ai-sdk-agents/react build` emits JS + `.d.ts`
- [x] Fixtures/tests excluded from `dist`
- [x] `"use client"` restored on public entries after tsup via `scripts/ensure-use-client.mjs`
- [x] Private seams not re-exported (`createDataStreamStore`, `deliverBatch`)

## Verification commands

```bash
pnpm --filter @ai-sdk-agents/react typecheck
pnpm --filter @ai-sdk-agents/react test
pnpm --filter @ai-sdk-agents/react build
pnpm --filter @ai-sdk-agents/react verify:publish
```

## M6 — first public release

```bash
pnpm --filter @ai-sdk-agents/react publish --access public
```

Requires:

1. npm login with permission to publish under `@ai-sdk-agents`
2. npm org `ai-sdk-agents` (create at https://www.npmjs.com/org/create if needed)
3. Green `prepublishOnly` gate (typecheck, test, build, verify:publish)

## Later releases

Bump version intentionally, then publish again. Prefer Changesets once multiple `@ai-sdk-agents/*` packages exist.
