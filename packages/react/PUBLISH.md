# Publish checklist — `@aisdkagents/react`

## Metadata

- [x] Package name: `@aisdkagents/react`
- [x] `"type": "module"`
- [x] `"sideEffects": false`
- [x] `files` publishes `dist` + `README.md` (not `src`, fixtures, or tests)
- [x] React `^19` peer dependency
- [x] No `ai` peer/runtime dependency (structural types; `ai` is a devDependency)
- [x] Root + `./data-stream-controller` exports point at `dist`
- [x] `publishConfig.access`: `public`
- [x] M6: `private` removed; version `0.1.0`

## Build artifact

- [x] `pnpm --filter @aisdkagents/react build` emits JS + `.d.ts`
- [x] Fixtures/tests excluded from `dist`
- [x] `"use client"` restored on public entries after tsup via `scripts/ensure-use-client.mjs`
- [x] Private seams not re-exported (`createDataStreamStore`, `deliverBatch`)

## Verification commands

```bash
pnpm --filter @aisdkagents/react typecheck
pnpm --filter @aisdkagents/react test
pnpm --filter @aisdkagents/react build
pnpm --filter @aisdkagents/react verify:publish
```

## M6 — first public release

```bash
pnpm --filter @aisdkagents/react publish --access public
```

Requires:

1. npm login as `aisdkagents` (user scope — no separate org required)
2. Green verification commands above (CI / `pnpm release` run these before publish)

Note: npm org `ai-sdk-agents` is unavailable (unscoped package name taken). Scope is `@aisdkagents` to match the npm user.

## Later releases

Prefer the Changesets + GitHub Actions path in [RELEASING.md](../../RELEASING.md) (Trusted Publisher / OIDC via `release.yml`).

Manual escape hatch (after login as `aisdkagents`):

```bash
# bump version in package.json, then:
pnpm --filter @aisdkagents/react publish --access public
```
