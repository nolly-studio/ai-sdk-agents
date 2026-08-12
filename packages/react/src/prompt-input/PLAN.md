# PromptInput — Plan

Living implementation plan for the headless prompt / AI input primitive.

**Status:** Primitive v1 + styled skin + demo composer **shipped**. Capability checkboxes live in [`INTERFACE.md`](./INTERFACE.md) §3. This file tracks layers, seams, and remaining polish — not a greenfield scaffold.

**Quality bar:** `react/src/questionnaire/` + headless-primitives skill.

---

## 1. Domain sentence

> This primitive manages prompt composition — rich editor value, inline tokens, attachments, selection catalogs, slash/@ (and custom) command palettes, and submit — so consumers can build many kinds of AI composers without reimplementing caret detection, token insertion, keyboard menus, or message serialization.

---

## 2. Layer model (dependency arrow)

```text
@shadcn/react/prompt-input              ← headless behavior
        ↓
components/ui/prompt-input.tsx          ← styled, app-agnostic skin
        ↓
components/prompt-input/*               ← demo catalogs, brands, auth, stream
```

| Layer | Owns | Must not own |
| --- | --- | --- |
| **Primitive** | Editor/tokens/attachments/menus/focus/submit; structural `data-*`; `createTokenElement` / `onTokenRemove` | Tailwind, brands, Motion, catalogs, transport |
| **UI skin** | Semantic Tailwind + `data-slot`s, layout variants, default token CSS, remove animation, preview dialogs | `DemoSource`, Figma/Gmail/Slack, connect/stream |
| **Demo / app** | `DEFAULT_*`, glyphs, `createDemoTokenElement`, auth, streaming, composition | Behavior state machines |

**Invariant:** `components/ui/prompt-input.tsx` must not import `@/components/prompt-input/*`. App depends on skin; skin depends on primitive.

Matches Questionnaire: primitive wrappers, `ComponentProps`, `cn(defaults, className)`, no app imports in the skin.

---

## 3. Split: inspiration → primitive vs skin

Source: `components/__inspiration__/in-progress/prompt-input.tsx` (~2.7k lines).

| Keep in primitive | Stay in styled / app |
| --- | --- |
| Contenteditable editor + caret/token helpers | Semantic theme utilities (`bg-popover`, `text-primary`, …) |
| Slash (`/`) + At (`@`) palette state | Menu / palette / chip chrome |
| Structural pill insert/remove (`data-token`, slots) | Compact token CSS; optional `[data-remove]` |
| Attachment list + file picker + object URL lifecycle | Tiles, preview dialogs, chip layout |
| Model / selection controlled state | Plus-menu flyouts, model icons |
| Submit / Enter / Escape / palette nav | Send icon, expand layout grid |
| Message payload helpers | `variant` Rounded/Pill, `largeAttachments` |
| Filtering, sections, `attach` → file picker | Default catalogs + brand SVGs (demo only) |

`DEFAULT_MODELS` / `SKILLS` / `SOURCES` live under `components/prompt-input/`, not `@shadcn/react`.

---

## 4. Platform contract

- **Root** defaults to `<form>` (or form-like host via `render`).
- **Editor** is contenteditable (`role="combobox"` when palettes exist) — not a native `<textarea>` when rich tokens need real DOM nodes.
- On submit: structured **message** (primary DX) + optional `FormData` / hidden-field helpers.
- Chat UIs need `File[]` + ordered token ids — not FormData-only.

Documented in [`README.md`](./README.md).

---

## 5. Public namespace (shipped)

```ts
export const PromptInput = {
  Root,
  Provider,
  Editor,
  Submit,
  Attachments,
  Attachment,
  AttachmentRemove,
  FileTrigger,
  FileInput,
  ScreenshotTrigger,
  Menu,
  MenuTrigger,
  MenuContent,
  MenuFlyout,
  MenuFlyoutTrigger,
  Model,
  Skill,
  Source,
  SlashPalette,
  AtPalette,
  PaletteItem,
  ReferencedSources,
  ReferencedSource,
  ReferencedSourceRemove,
  LiveRegion,
};
```

Layout shells (`Leading` / `Trailing` / `Body` / …) are **styled-only** in `components/ui/prompt-input.tsx`.

Every interactive/host part: `render` + `useRender`.

Minimal valid composer: `Root` + `Editor` + `Submit`.

---

## 6. Token chrome IoC (resolved)

| Concern | Owner |
| --- | --- |
| Insert / remove ranges, `\u00A0` cleanup, id collection | Primitive |
| Default structural pill (label slot, no ×) | `createDefaultTokenElement` |
| Click-to-remove via `[data-remove]` | Optional; `removeTokenNearest` still wired |
| Backspace deletes `contenteditable=false` atoms | Platform + editor |
| Visual size / color / icons | Skin `TOKEN_STYLES` on `[data-token]` |
| Brand marks in pills | Demo `createDemoTokenElement` only |

**Design polish (current skin):** compact `h-5` / `11px` tokens, `rounded-md`, no × — Backspace removes. Skin hides leftover `[data-remove]` if a custom factory still emits them.

---

## 7. Module layout (shipped)

```text
react/src/prompt-input/
  INTERFACE.md
  PLAN.md
  README.md
  types.ts
  collection.ts
  editor.ts
  tokens.ts
  filter.ts
  attachments.ts
  file-meta.ts
  form-data.ts
  screenshot.ts
  utils.ts
  context.tsx
  use-prompt-input-root.ts
  use-token-palette.ts
  components.tsx
  index.ts
  prompt-input.test.tsx
  prompt-input.browser.test.tsx
```

Skin / app (outside package):

```text
components/ui/prompt-input.tsx              # semantic skin
components/prompt-input/
  demo-composer.tsx
  create-demo-token-element.ts
  defaults.ts
  brands.tsx / glyphs.tsx
  use-connector-auth.ts
  use-prompt-stream.ts
  index.ts
```

Rules:

- Logic in hooks + pure modules; components stay thin
- No Tailwind / CSS modules / icons in the behavior package
- React is a peerDependency; reuse `../use-render`
- Package export: `@shadcn/react/prompt-input`

---

## 8. Styled wrapper (shipped)

`components/ui/prompt-input.tsx`:

- Imports `PromptInput as PromptInputPrimitive`
- Flat exports for DX (`PromptInputMenuIcon`, `PromptInputPaletteSectionLabel`, …)
- `React.ComponentProps<typeof Primitive.Part>`
- `cn(defaults, className)` + stable `data-slot`
- Semantic theme tokens from app `globals.css` (no parallel `--pi-*` system)
- Structural token CSS via `[&_[data-token]]…` on Root
- Default `onTokenRemove` → Motion width-collapse animation
- Overlay host portals menus/palettes outside `overflow-x-hidden` frame
- Auto-expand **measure span lives inside the clipped frame** (avoids page horizontal overflow on long paste)

Demo: `PromptInputDemoComposer` passes `createTokenElement={createDemoTokenElement}` and source `icon`s; no brands in the skin API.

---

## 9. Phased delivery

| Phase | Deliverable                                       | Status   |
| ----- | ------------------------------------------------- | -------- |
| 0     | Scaffold + INTERFACE.md + PLAN.md                 | **done** |
| 1     | `editor.ts` / `use-token-palette.ts` + unit tests | **done** |
| 2     | Root + Editor + Submit                            | **done** |
| 3     | Slash/At palettes + token insert IoC              | **done** |
| 4     | Attachments + FileInput                           | **done** |
| 5     | Menu / Model / Skill / Source parts               | **done** |
| 5b–c  | INTERFACE §3 `must` / `should` / `later`          | **done** |
| 6     | Styled wrapper (semantic remap, no app imports)   | **done** |
| 6b    | Demo composer + `createDemoTokenElement`          | **done** |
| 6c    | Compact tokens (no ×); measure-span overflow fix  | **done** |
| 7     | Acceptance checklist pass + browser caret suite   | **next** |
| 8     | Registry packaging / docs polish                  | later    |

---

## 10. Remaining work

### Next (phase 7)

- [ ] Walk headless-primitives acceptance checklist end-to-end
- [ ] Expand browser caret / Backspace-on-token coverage
- [ ] Confirm light/dark + `className` override smoke on skin

### Optional follow-ups

- [ ] Generic catalog naming aliases (keep Skill/Source/Model as DX)
- [ ] Preview dialog visual parity (lightbox vs document) polish
- [ ] Further token density / color tuning against product skins
- [ ] Publish checklist: peerDeps, `sideEffects`, `"use client"` in dist

### Explicitly out of scope for the primitive

- Network / streaming transport
- Connector auth
- Default product catalogs and brand SVGs
- Plus-menu visual chrome, Motion, preview dialogs

---

## 11. Test plan

| Area | Cases | Status |
| --- | --- | --- |
| Uncontrolled submit / clear | payload shape | covered |
| Controlled value/model/attachments | parent wins | covered |
| Slash / At palettes | filter, insert, Escape, `/` suppresses `@` | covered |
| Keyboard | palette nav; Enter does not send while open | covered |
| Attachments | add/remove; URL revoke | covered |
| Registration / `render` | merge + `defaultPrevented` | covered |
| File-meta helpers | ext / size / text-like | covered |
| Browser | empty-editor first `/`, Backspace on token | **expand** |

Run: `cd react && bun run test src/prompt-input/prompt-input.test.tsx`

---

## 12. Acceptance checklist (ship gate)

From headless-primitives `references/acceptance-checklist.md`:

- [x] Namespace export — no required style props
- [x] Every part wraps one default semantic element
- [x] Every interactive/host part supports `render`
- [x] Typed state → `data-*` (selected subset)
- [x] Controlled + uncontrolled for owned state
- [x] User `on*` first; honor `defaultPrevented`
- [x] Context guards: `"must be used within …"`
- [x] Registration; Root does not scrape CSS classes
- [x] Platform contract documented (README)
- [x] Optional schema reconciled with registrations
- [x] DEV warnings for schema/tree drift
- [x] No Tailwind/CSS/icons in behavior package
- [ ] React peerDependency / `sideEffects` verified for publish
- [x] Pure DOM unit tests
- [ ] Browser caret suite complete
- [x] README: anatomy, controlled props, platform contract
- [x] Styled wrapper: `data-slot`, `cn`, no second state machine, no app imports

---

## Related

- [`INTERFACE.md`](./INTERFACE.md) — capability checklist source of truth
- [`README.md`](./README.md) — consumer docs
- Inspiration: `components/__inspiration__/in-progress/prompt-input.tsx`
- Skin: `components/ui/prompt-input.tsx`
- Demo: `components/prompt-input/demo-composer.tsx`
- Reference primitive: `react/src/questionnaire/`
- Reference skin: `components/ui/questionnaire.tsx`
