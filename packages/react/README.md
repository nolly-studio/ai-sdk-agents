# `@ai-sdk-agents/react`

Headless React primitives for AI SDK agent UIs.

This package owns **behavior** (stream bridging, and later artifact sessions / HITL controllers). Styled adapters and paid Pattern demos live in the private catalog — not this public repo.

## Status

Published. First primitive: **DataStreamController** (frozen v1).

## Install

```bash
pnpm add @ai-sdk-agents/react
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
import { DataStreamController } from "@ai-sdk-agents/react";

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
pnpm --filter @ai-sdk-agents/react typecheck
pnpm --filter @ai-sdk-agents/react test
pnpm --filter @ai-sdk-agents/react build
pnpm --filter @ai-sdk-agents/react verify:publish
```

See [`PUBLISH.md`](./PUBLISH.md) for the release checklist.

## Scope

Package name `@ai-sdk-agents/react` matches the AISDK Agents product. The unscoped npm name `ai-sdk-agents` is taken.

Not the same as Midday’s `@ai-sdk-tools/*` packages.
