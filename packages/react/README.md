# `@aisdkagents/react`

Headless React primitives for AI SDK agent UIs.

This package owns **behavior** (stream bridging, and later artifact sessions / HITL controllers). Styled adapters and paid Pattern demos live in the private catalog — not this public repo.

## Status

Published. First primitive: **DataStreamController** (frozen v1).

## Install

```bash
pnpm add @aisdkagents/react
```

Composition example via shadcn registry (depends on this package):

```bash
npx shadcn@latest add https://<your-deployed-host>/r/data-stream-controller-demo.json
```

## Primitives

| Primitive | Archetype | Path | Status |
| --- | --- | --- | --- |
| DataStreamController | observer / controller | [`src/data-stream-controller`](./src/data-stream-controller) | v0.1.0 |

## Quick start

```tsx
import { DataStreamController } from "@aisdkagents/react";

function App() {
  return (
    <DataStreamController.Root>
      <DataStreamController.Handler
        onPart={({ part }) => {
          // sink
        }}
      />
      <ChatIngress />
    </DataStreamController.Root>
  );
}

function ChatIngress() {
  const append = DataStreamController.useAppend();
  // useChat({ onData: append })
  return null;
}
```

## Development

```bash
pnpm --filter @aisdkagents/react typecheck
pnpm --filter @aisdkagents/react test
pnpm --filter @aisdkagents/react build
pnpm --filter @aisdkagents/react verify:publish
```

See [`PUBLISH.md`](./PUBLISH.md) for the release checklist.

## Scope

Package name `@aisdkagents/react` matches the AISDK Agents product. The unscoped npm name `ai-sdk-agents` is taken.

Not the same as Midday’s `@ai-sdk-tools/*` packages.
