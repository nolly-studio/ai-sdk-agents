# PromptInput

An unstyled prompt / AI input primitive for React. `Root` renders a native `form`. Submit delivers a structured message; the editor also mirrors text into a hidden `message` field.

Design contract: [`INTERFACE.md`](./INTERFACE.md)  
Implementation plan: [`PLAN.md`](./PLAN.md)

## Anatomy

```tsx
import { PromptInput, usePromptInputContext } from "@shadcn/react/prompt-input";

const skills = [{ id: "research", name: "Deep Research" }];
const sources = [{ id: "web", name: "Web" }];
const models = [{ id: "opus", name: "Opus" }];

export function Composer() {
  return (
    <PromptInput.Root
      skills={skills}
      sources={sources}
      models={models}
      onSubmit={(event, message) => {
        console.log(message.text, message.skillIds, message.attachments);
      }}
    >
      <PromptInput.FileInput />
      <PromptInput.Attachments />
      <PromptInput.Menu>
        <PromptInput.MenuTrigger />
        <PromptInput.MenuContent>
          <PromptInput.FileTrigger kind="image" />
          <PromptInput.FileTrigger kind="file" />
          <PromptInput.MenuFlyout name="skills">
            {skills.map((skill) => (
              <PromptInput.Skill key={skill.id} value={skill.id}>
                {skill.name}
              </PromptInput.Skill>
            ))}
          </PromptInput.MenuFlyout>
          <PromptInput.MenuFlyout name="sources">
            {sources.map((source) => (
              <PromptInput.Source key={source.id} value={source.id}>
                {source.name}
              </PromptInput.Source>
            ))}
          </PromptInput.MenuFlyout>
          {models.map((model) => (
            <PromptInput.Model key={model.id} value={model.id}>
              {model.name}
            </PromptInput.Model>
          ))}
        </PromptInput.MenuContent>
      </PromptInput.Menu>
      <PromptInput.Editor placeholder="Write a message…" />
      <PromptInput.Submit />
      <PromptInput.SlashPalette>
        <PaletteItems catalog="slash" />
      </PromptInput.SlashPalette>
      <PromptInput.AtPalette>
        <PaletteItems catalog="at" />
      </PromptInput.AtPalette>
    </PromptInput.Root>
  );
}

function PaletteItems({ catalog }: { catalog: "slash" | "at" }) {
  const ctx = usePromptInputContext("PaletteItems");
  const results = catalog === "slash" ? ctx.slashResults : ctx.atResults;
  return results.map((item) => (
    <PromptInput.PaletteItem key={item.id} value={item.id}>
      {item.name}
    </PromptInput.PaletteItem>
  ));
}
```

Minimal composer: `Root` + `Editor` + `Submit`.

Import `usePromptInputContext` when a skin needs live palette results.

## Platform contract

| Concern | Behavior |
| --- | --- |
| Host | `Root` → `<form>` |
| Editor | contenteditable combobox; hidden `<input name="message">` mirrors text |
| Submit | `onSubmit(event, message)`; honor `defaultPrevented`; optional async await before clear |
| Tokens | `/` skills and `@` sources by default; override with `triggers` |
| Token chrome | `createTokenElement` or structural default spans (`data-skill` / `data-source`) |
| Files | `<input type="file">`, paste, form drag/drop; `maxFiles` / `maxFileSize` / `accept` |
| Status | `status` + `onStop` for streaming stop button |
| Editor modes | `editorMode="rich" \| "plain"`, `multiline={false}` for single-line |
| FormData | `syncHiddenInput` + `messageToFormData(message)` |
| Extras | `globalDrop`, `ScreenshotTrigger`, referenced sources, `LiveRegion` |

## Controlled props

| State       | Uncontrolled         | Controlled    | Callback              |
| ----------- | -------------------- | ------------- | --------------------- |
| Text        | `defaultValue`       | `value`       | `onValueChange`       |
| Model       | `defaultModelId`     | `modelId`     | `onModelChange`       |
| Attachments | `defaultAttachments` | `attachments` | `onAttachmentsChange` |
| Menu        | `defaultMenuOpen`    | `menuOpen`    | `onMenuOpenChange`    |

Lift state with `PromptInput.Provider` when the composer must share value/attachments outside `Root`.

## Styled skin + app helpers (sandbox)

| Layer | Path |
| --- | --- |
| Skin | `components/ui/prompt-input.tsx` (`--pi-*` tokens, layout, menus, pills) |
| Demo catalogs | `components/prompt-input/defaults.ts` |
| Connect auth | `components/prompt-input/use-connector-auth.ts` |
| Streaming transport | `components/prompt-input/use-prompt-stream.ts` |
| Full demo | `components/prompt-input/demo-composer.tsx` |

```tsx
import { PromptInputDemoComposer } from "@/components/prompt-input";

export function Page() {
  return <PromptInputDemoComposer />;
}
```

## Related

- Inspiration UI: `components/__inspiration__/in-progress/prompt-input.tsx`
- Pattern reference: `react/src/questionnaire/`
