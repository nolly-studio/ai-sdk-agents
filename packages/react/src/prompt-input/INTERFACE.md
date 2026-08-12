# PromptInput — Interface

Living design contract for the headless prompt / AI input primitive.

This file is the source of truth for **what the primitive is for** and **what must stay true** as we refine the public API. Implementation details live in [`PLAN.md`](./PLAN.md). Behavior quality bar: `@shadcn/react` Questionnaire.

---

## 1. One-sentence domain

> This primitive manages **prompt composition** — value, tokens, attachments, selection catalogs, command palettes, and submit — so consumers can build many kinds of AI inputs without reimplementing caret/token detection, keyboard menus, focus, or message serialization.

---

## 2. Design objectives

### 2.1 One engine, many skins

Support a wide family of AI composers from the **same behavior package**:

| Surface           | Example differences (consumer-owned)       |
| ----------------- | ------------------------------------------ |
| Chat composer     | Send on Enter, attachments, model picker   |
| Inline AI edit    | Compact, no model menu, submit = apply     |
| Agent / tool bar  | Slash skills, `@` sources, connectors      |
| Search-as-prompt  | Single-line, no multiline Enter            |
| Voice-first       | Mic primary; text secondary                |
| Structured prompt | Forms + free text hybrid                   |
| Minimal textarea  | No palettes; still uses Root/Editor/Submit |

The primitive must **not** encode one product look or one fixed chrome tree. Layout, icons, motion, and opinionated menus belong in styled wrappers or apps.

### 2.2 Composition over configuration

Prefer compound parts over a mega `<PromptInput data={…} />` widget.

- Consumers own tree structure and which capabilities they mount.
- Root coordinates; children register capabilities.
- Optional schema props describe catalogs for order/SSR/filter — children realize controls.

### 2.3 Headless IoC

Invert control on every axis Questionnaire does:

| Axis | Rule |
| --- | --- |
| Structure | Children form the tree |
| Host element | Semantic default + `render` / `useRender` |
| Style | State → `data-*`; no Tailwind/icons in the package |
| State | Controlled + uncontrolled for every owned concern |
| Events | User `on*` first; honor `defaultPrevented` |
| Catalogs | Optional schema + runtime registration; DEV drift warnings |
| Tokens / pills | Consumer (or skin) supplies token chrome; primitive owns ranges |

### 2.4 Native platform where it helps

Prefer web platform contracts over reinvented bags:

- Root defaults toward `<form>` (submit, progressive enhancement).
- File picking via real `<input type="file">`.
- Editor may be contenteditable when rich tokens require it (not a fake textarea API).
- Primary DX for AI apps: a structured **message / value** callback, with optional `FormData` helpers — not FormData-only.

### 2.5 Progressive capability

Mounting a part opts into that engine. Unmounted capabilities must not force API surface or runtime cost.

Examples:

- No `SlashPalette` / skill registrations → `/` is plain text (or no-op).
- No attachments parts → no file state.
- No model parts → no model id in the message (or omitted field).

### 2.6 Extensible catalogs, not fixed domains

“Skill”, “source”, and “model” in the inspiration UI are **instances** of a more general idea: **selectable catalog items** that may:

- insert an inline token,
- open a file picker,
- run a command,
- toggle a connection,
- or only set Root state (e.g. model id).

The public interface should allow multiple catalogs / triggers (`/`, `@`, custom) without baking Anthropic/OpenAI product taxonomy into the core.

### 2.7 Accessible by default

- Semantic HTML first; ARIA when needed (listbox/combobox for palettes).
- Full keyboard path for editor, menus, palettes, submit.
- Focus management documented and tested.
- Styled layer must not reimplement roles/state — only visuals.

### 2.8 Testable without a skin

Behavior tests pass with unstyled hosts. Browser tests cover caret/token edge cases. Pure DOM helpers stay free of React UI imports.

---

## 3. Capability checklist

Inventory of functionality the primitive family may need. Sourced from `components/__inspiration__/in-progress/prompt-input.tsx`, `components/ai-elements/prompt-input.tsx`, and multi-surface goals in §2.1.

**Priority** (hone these labels as we decide v1 scope):

| Label    | Meaning                              |
| -------- | ------------------------------------ |
| `must`   | Primitive v1 — core engine           |
| `should` | Primitive soon after v1 / high value |
| `later`  | Primitive eventually / opt-in        |
| `skin`   | Styled wrapper or layout only        |
| `app`    | App, auth, transport, or demo data   |

**Source:** `insp` = inspiration · `ai` = ai-elements · `ideal` = multi-surface goal

Checkboxes track whether the capability is implemented in the public API. `must` / `should` / `later` / `skin` / `app` are implemented (`components/ui/prompt-input.tsx` + `components/prompt-input/*`).

### 3.1 Root / form

|  | Pri | Src | Capability |
| --- | --- | --- | --- |
| [x] | must | both | Form-like root coordinating editor, menus, attachments, submit |
| [x] | must | both | Controlled + uncontrolled text value |
| [x] | must | insp | Controlled + uncontrolled model / selection id |
| [x] | must | ideal | Disabled / readonly / submitting gates |
| [x] | must | insp | Clear-after-submit (text + attachments + tokens) |
| [x] | must | both | Structured message payload on submit |
| [x] | must | both | `defaultPrevented` / cancelable submit |
| [x] | should | ai | Async submit (await before clear) |
| [x] | should | ai | Lifted provider / controller (state outside Root) |
| [x] | later | ai | `FormData` / hidden-input sync for native posts |

### 3.2 Editor

|     | Pri    | Src   | Capability                                        |
| --- | ------ | ----- | ------------------------------------------------- |
| [x] | must   | insp  | Contenteditable rich surface (pills as DOM nodes) |
| [x] | must   | both  | Placeholder + empty state (`data-empty`)          |
| [x] | must   | both  | Enter = submit; Shift+Enter = newline (policy)    |
| [x] | must   | insp  | Save / restore selection (for menu insert)        |
| [x] | must   | insp  | Focus editor end after send / attach              |
| [x] | must   | insp  | Caret resolution in empty editor (first `/` `@`)  |
| [x] | must   | insp  | Sync plain-text value from DOM                    |
| [x] | should | ai    | IME composition guard (don’t submit mid-compose)  |
| [x] | should | ai    | Named field for form posts (`name="message"`)     |
| [x] | later  | ai    | Plain textarea mode (no rich tokens)              |
| [x] | later  | ideal | Single-line mode (Enter never newlines)           |
| [x] | skin   | both  | Multiline scroll / max-height chrome              |

### 3.3 Inline tokens + palettes

|  | Pri | Src | Capability |
| --- | --- | --- | --- |
| [x] | must | insp | Detect `/query` at caret (boundary-aware) |
| [x] | must | insp | Detect `@query` at caret (boundary-aware) |
| [x] | must | insp | Mutual exclusion (`/` suppresses `@`) |
| [x] | must | insp | Filter catalog by name/desc |
| [x] | must | insp | Palette open / query / highlight index |
| [x] | must | insp | Keyboard: ↑↓ Enter Tab Escape |
| [x] | must | insp | Keyboard vs mouse highlight (ignore hover after keys) |
| [x] | must | insp | Window capture keydown while palette open |
| [x] | must | insp | Replace trigger token range with pill |
| [x] | must | insp | Insert pill at saved selection (from menu) |
| [x] | must | insp | Remove pill (+ trailing nbsp cleanup) |
| [x] | must | insp | Token data attrs (`data-skill` / `data-source`, `data-start`, `data-selected`, …) |
| [x] | must | insp | Collect ordered skill/source ids on submit |
| [x] | must | ideal | Token chrome IoC (`createTokenElement` / structural span) |
| [x] | should | ideal | Custom triggers (not only `/` `@`) |
| [x] | should | ideal | `aria-activedescendant` / combobox pattern |
| [x] | should | insp | Empty results handling |
| [x] | skin | insp | Animated pill remove (width collapse) |
| [x] | skin | insp | Compact skill/source tokens (no ×; Backspace deletes) |
| [x] | skin | insp | Slash / At palette visual chrome |

### 3.4 Catalogs

|  | Pri | Src | Capability |
| --- | --- | --- | --- |
| [x] | must | insp | Skills list (schema + registration) |
| [x] | must | insp | Sources list + sections (`add` / `plugins`) |
| [x] | must | insp | Models list + selected model |
| [x] | must | insp | Source action: insert mention |
| [x] | must | insp | Source action: `attach` → open file picker |
| [x] | must | ideal | Generic catalog item actions (insert / command / attach / select) |
| [x] | should | insp | Source action: `connect` state flag |
| [x] | should | ideal | Disabled items in catalogs |
| [x] | should | ideal | DEV schema vs tree drift warnings |
| [x] | app | insp | Connect auth / OAuth for connectors |
| [x] | app | insp | Default models / skills / sources demo catalogs |

### 3.5 Action / plus menu

|     | Pri    | Src  | Capability                                  |
| --- | ------ | ---- | ------------------------------------------- |
| [x] | must   | insp | Menu trigger toggle (`aria-expanded`)       |
| [x] | must   | insp | Outside pointer + Escape dismiss            |
| [x] | should | insp | Nested flyouts open state (Sources, Skills) |
| [x] | should | insp | Menu actions: add photos / attach files     |
| [x] | should | insp | Menu insert skill / source                  |
| [x] | should | insp | Model radio select + selected state         |
| [x] | should | ai   | Action menu as composable parts             |
| [x] | later  | insp | Hover-bridge keep flyout open across gap    |
| [x] | skin   | insp | Anchor position / motion chrome             |
| [x] | skin   | insp | Model hover tooltip (desc, context window)  |

### 3.6 Attachments

|  | Pri | Src | Capability |
| --- | --- | --- | --- |
| [x] | must | both | Hidden `<input type="file">` |
| [x] | must | both | `accept` / image vs any file |
| [x] | must | both | Multiple files |
| [x] | must | both | Add / remove / clear attachments |
| [x] | must | both | Object URL create + revoke (remove / unmount / clear) |
| [x] | must | insp | Image vs file kind |
| [x] | should | ai | `maxFiles` / `maxFileSize` / accept errors |
| [x] | should | ai | Paste files/images into editor |
| [x] | should | ai | Drag-and-drop on form |
| [x] | should | ai | Backspace on empty editor removes last attachment |
| [x] | should | ai | Open file dialog imperative API |
| [x] | later | ai | Global document drop (opt-in) |
| [x] | later | ai | Screenshot capture → attachment |
| [x] | later | ai | Referenced documents list (AI SDK source parts) |
| [x] | skin | insp | Compact chips vs large tiles |
| [x] | skin | insp | Image / text-file preview dialogs |
| [x] | later | insp | File meta helpers (ext, size, text-like) — pure utils OK in package |

### 3.7 Submit / transport UX

|     | Pri    | Src  | Capability                                        |
| --- | ------ | ---- | ------------------------------------------------- |
| [x] | must   | insp | Ready when text or attachments nonempty           |
| [x] | must   | both | Submit disabled when not ready                    |
| [x] | should | ai   | Chat status: idle / submitted / streaming / error |
| [x] | should | ai   | Stop generation (`onStop`, button type swap)      |
| [x] | app    | —    | Actual streaming / network transport              |

### 3.8 Layout / frame (styled)

|     | Pri  | Src  | Capability                                     |
| --- | ---- | ---- | ---------------------------------------------- |
| [x] | skin | insp | Expanded vs inline layout (measure text width) |
| [x] | skin | insp | Tall frame when attachments present            |
| [x] | skin | insp | Variant Rounded / Pill                         |
| [x] | skin | ai   | Header / body / footer / tools slots           |
| [x] | skin | insp | Leading / trailing control slots               |

### 3.9 Accessibility

|     | Pri    | Src   | Capability                                            |
| --- | ------ | ----- | ----------------------------------------------------- |
| [x] | must   | insp  | `role="textbox"` + `aria-multiline` + accessible name |
| [x] | must   | insp  | Menu roles (`menu` / `menuitem` / `menuitemradio`)    |
| [x] | must   | insp  | Remove controls `aria-label`                          |
| [x] | should | ideal | Full palette listbox / combobox a11y                  |
| [x] | later  | ideal | Live region for errors / status                       |

### 3.10 Headless platform

|     | Pri  | Src   | Capability                                           |
| --- | ---- | ----- | ---------------------------------------------------- |
| [x] | must | ideal | `render` / host swap per part (`useRender`)          |
| [x] | must | ideal | State → `data-*` for styling                         |
| [x] | must | ideal | Registration APIs (no class scraping)                |
| [x] | skin | insp  | Semantic theme tokens + Motion; brands stay app/demo |
| [x] | skin | ai    | Select / HoverCard / Command visual wrappers         |

### 3.11 Priority summary

| Bucket   | Count (approx) | Role                                  |
| -------- | -------------- | ------------------------------------- |
| `must`   | ~45            | Ship in primitive v1                  |
| `should` | ~25            | Next waves; don’t paint into a corner |
| `later`  | ~10            | Opt-in / niche surfaces               |
| `skin`   | ~20            | `components/ui/prompt-input.tsx`      |
| `app`    | ~4             | Auth, transport, demo catalogs        |

When honing: demote a `must` only if a multi-surface composer can still work without it; promote a `later` only with a concrete consumer.

---

## 4. In scope vs out of scope

### In scope (primitive)

- Everything marked `must` / `should` / `later` in §3
- Root orchestration and nested contexts
- Message / value serialization helpers
- Pure DOM/utils (caret, filter, revoke) with zero React UI imports

### Out of scope (styled wrapper or app)

- Everything marked `skin` or `app` in §3
- Tailwind, design tokens, icons, brand marks
- Motion / layout expand measurement
- Opinionated Plus-menu chrome, preview dialogs
- Default model/skill/source catalogs
- Product variants (`Rounded` / `Pill`, large attachment tiles)
- Network, auth, “connect plugin”, streaming transport
- Full rich-text editor framework (tables, markdown WYSIWYG, etc.)

---

## 5. Non-goals

- Replacing every AI input in the wild with one look
- Competing with TipTap/Lexical as a general editor
- Shipping Motion or icon packs inside `@shadcn/react`
- Requiring consumers to use skills/sources/models naming

---

## 6. Working principles for API design

1. **Name by role, not by one product.** Prefer `Editor`, `Submit`, `Palette`, `Token`, `Attachment`, `Catalog` / `Item` over hard-coding only Claude-shaped menus — aliases or styled bundles can restore skill/source DX.
2. **Stable core, swappable catalogs.** Triggers (`/`, `@`, custom) and item actions should be data/registration-driven.
3. **Smallest useful Root.** A valid composer can be `Root` + `Editor` + `Submit` alone.
4. **Skin is a customer.** `components/ui/prompt-input.tsx` is not a second state machine; it only styles and bundles parts.
5. **Document the platform contract** in README once the message shape lands.
6. **Hone this file before locking types.** `types.ts` stubs follow the plan; INTERFACE wins when they conflict until we freeze v1.
7. **§3 is the backlog.** Change priorities here before expanding `types.ts`.

---

## 7. Open questions (hone next)

Track decisions here as we answer them together:

1. **Package name:** `PromptInput` vs `Composer` vs `Prompt`?
2. **Catalog model:** specialized `Skill` / `Source` / `Model` parts vs generic `Catalog` + `Item` + action types (with styled aliases)?
3. **Token chrome IoC:** `renderToken` / `createTokenElement` vs structural unstyled spans vs React-managed tokens?
4. **Value model:** plain text + id lists vs serializable rich document?
5. **Submit contract:** `onSubmit(event, message)` vs `onSend(message)` vs both?
6. **Menu depth in v1:** full compound menu vs palettes + editor only first?
7. **Compatibility** with existing `components/ai-elements/prompt-input`?
8. **Which §3 `should` rows become `must` for the first usable demo skin?**

---

## 8. Success criteria

We succeed when:

- [ ] Multiple distinct AI input UIs share one primitive without forking state
- [ ] Minimal `Root` + `Editor` + `Submit` works
- [ ] Adding slash/`@`/attachments/model is opt-in composition
- [ ] A styled wrapper can recreate the inspiration composer
- [ ] Acceptance checklist in the headless-primitives skill passes
- [ ] §3 priorities stay honest (no silent scope creep into `must`)
- [ ] This INTERFACE.md stays re-readable before every API change

---

## Related

- [`PLAN.md`](./PLAN.md) — phases, modules, part sketch, test plan
- [`README.md`](./README.md) — usage (filled as API stabilizes)
- Reference: `react/src/questionnaire/`
- Inspiration: `components/__inspiration__/in-progress/prompt-input.tsx`
- Also: `components/ai-elements/prompt-input.tsx`
- Skill: `headless-primitives`
