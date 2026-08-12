# ArtifactSession

Headless single-kind artifact document session for AI SDK UI `data-*` streams.

Compose with [`DataStreamController`](../data-stream-controller): `Stream` mounts `Handler` and applies parts into an uncontrolled session store.

## Install

```bash
pnpm add @aisdkagents/react
```

```ts
import {
  createArtifactSession,
  DataStreamController,
} from "@aisdkagents/react";
// or: "@aisdkagents/react/artifact-session"
```

## Quick start

```tsx
const TextArtifactSession = createArtifactSession({
  adapter: {
    kind: "text",
    initialContent: () => "",
    clear: () => "",
    reducePart: ({ part, state }) => {
      if (part.type !== "data-textDelta") return null;
      return `${state.content}${part.data}`;
    },
  },
});

function App() {
  return (
    <DataStreamController.Root>
      <TextArtifactSession.Root>
        <TextArtifactSession.Stream />
        <ChatIngress />
        <Panel />
      </TextArtifactSession.Root>
    </DataStreamController.Root>
  );
}

function ChatIngress() {
  const append = DataStreamController.useAppend();
  // useChat({ onData: append })
  return null;
}
```

## Contract

Authoritative surface: [`INTERFACE.md`](./INTERFACE.md).

| API | Role |
| --- | --- |
| `createArtifactSession({ adapter })` | Bind one kind; returns Root / Stream / hooks |
| `Root` | Provider + store lifetime |
| `Stream` | `DataStreamController.Handler` → `applyPart` |
| `useSnapshot` / `useSelector` | Read state (`Object.is` selectors) |
| `useController` | `applyPart` / `setContent` / `reset` |

**Not in v1:** visibility, versions, metadata, multi-kind, controlled fields, public binder, custom `isEqual`.
