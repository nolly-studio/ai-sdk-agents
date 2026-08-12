# Publish checklist — `@ai-sdk-agents/react`

M5 exit criteria. Keep `private: true` until M6 is explicitly approved.

## Metadata

- [x] Package name: `@ai-sdk-agents/react`
- [x] `"type": "module"`
- [x] `"sideEffects": false`
- [x] `files` publishes `dist` + `README.md` (not `src`, fixtures, or tests)
- [x] React `^19` peer dependency
- [x] No `ai` peer/runtime dependency (structural types; `ai` is a devDependency)
- [x] Root + `./data-stream-controller` exports point at `dist`
- [x] `private: true` until M6

## Build artifact

- [x] `pnpm --filter @ai-sdk-agents/react build` emits JS + `.d.ts`
- [x] Fixtures/tests excluded from `dist`
- [x] `"use client"` restored on public entries after tsup via `scripts/ensure-use-client.mjs` (esbuild drops directives while bundling):
  - `dist/index.js`
  - `dist/data-stream-controller/index.js`
- [x] Private seams not re-exported (`createDataStreamStore`, `deliverBatch`)

## Verification commands

```bash
pnpm --filter @ai-sdk-agents/react typecheck
pnpm --filter @ai-sdk-agents/react test
pnpm --filter @ai-sdk-agents/react build
pnpm --filter @ai-sdk-agents/react verify:publish
```

`verify:publish` packs the package, installs it into a temporary clean consumer, and imports both the root and subpath entry.

## M6 (separate approval)

1. Confirm npm scope availability for `@ai-sdk-agents/react`
2. Bump version from `0.0.0`
3. Remove `private: true`
4. Publish and pin the exact version before Pattern migration (M7)
