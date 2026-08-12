# Registry

This repo uses **model C**:

- **npm** `@aisdkagents/react` — canonical headless behavior
- **shadcn registry** — composition examples that depend on the npm package

## Build

```bash
pnpm registry:build
```

Writes JSON to `apps/web/public/r/` (including `registry.json` and per-item files).

## Items

| Name | Type | Notes |
| --- | --- | --- |
| `data-stream-controller-demo` | `registry:component` | Root + Handler + useController demo; depends on `@aisdkagents/react` + shadcn `button` |

## Install

After the docs app is deployed (or any host serving `public/r`):

```bash
npx shadcn@latest add https://<your-deployed-host>/r/data-stream-controller-demo.json
```

Registry items depend on the published npm package:

```bash
pnpm add @aisdkagents/react
```

Do **not** add private Pattern / pro-block sources here.
