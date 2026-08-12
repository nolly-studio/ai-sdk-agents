# @aisdkagents/react

## 0.1.0

### Initial public release

- **DataStreamController** — headless observer/controller for AI SDK `data-*` UI parts (Root, Handler, `useController`, `useAppend`, `useStatus`)
- FIFO claim-before-dispatch; one Handler per Root
- No `ai` runtime dependency; React `^19` peer
- `"use client"` preserved on published entries
