# @aisdkagents/react

## 0.2.1

### Patch Changes

- [`56a7ad8`](https://github.com/nolly-studio/ai-sdk-agents/commit/56a7ad8ee5e5ec1106f81bb81b799c50460185e3) Thanks [@nolly-studio](https://github.com/nolly-studio)! - Enable tsup code splitting so DataStreamControllerContext is a single module across subpath entries (fixes Root/Stream context mismatch).

## 0.2.0

### Minor Changes

- [`272b5e8`](https://github.com/nolly-studio/ai-sdk-agents/commit/272b5e8f4428ad554d4ff2e528b21d37949d61a3) Thanks [@nolly-studio](https://github.com/nolly-studio)! - Add ArtifactSession and PromptInput headless primitives, plus public subpath exports.

## 0.1.0

### Initial public release

- **DataStreamController** — headless observer/controller for AI SDK `data-*` UI parts (Root, Handler, `useController`, `useAppend`, `useStatus`)
- FIFO claim-before-dispatch; one Handler per Root
- No `ai` runtime dependency; React `^19` peer
- `"use client"` preserved on published entries
