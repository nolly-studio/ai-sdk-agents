// @vitest-environment jsdom

import type * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { messageToFormData, PromptInput } from ".";
import { filterIncomingFiles } from "./attachments";
import { markTokenSelectionAttributes } from "./editor";
import {
  fileExtensionLabel,
  formatFileSize,
  isLikelyTextFile,
} from "./file-meta";
import { filterByNameOrDesc } from "./filter";
import { createDefaultTokenElement } from "./tokens";
import { matchesAccept } from "./utils";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

const skills = [
  { id: "deep-research", name: "Deep Research", desc: "citations" },
  { id: "code-review", name: "Code Review", desc: "find bugs" },
] as const;

const sources: {
  id: string;
  name: string;
  attach?: boolean;
  section: "add" | "plugins";
}[] = [
  { id: "attach", name: "Files", attach: true, section: "add" },
  { id: "web", name: "Web search", section: "add" },
];

const models = [
  { id: "opus", name: "Opus" },
  { id: "gpt", name: "GPT" },
] as const;

async function renderComposer(
  ui?: React.ReactNode,
  rootProps?: React.ComponentProps<typeof PromptInput.Root>
) {
  await act(() => {
    root.render(
      ui ?? (
        <PromptInput.Root
          models={models}
          skills={skills}
          sources={sources}
          {...rootProps}
        >
          <PromptInput.FileInput />
          <PromptInput.Menu>
            <PromptInput.MenuTrigger>Add</PromptInput.MenuTrigger>
            <PromptInput.MenuContent>
              <PromptInput.FileTrigger kind="image">
                Photos
              </PromptInput.FileTrigger>
              <PromptInput.MenuFlyout name="skills">
                {skills.map((skill) => (
                  <PromptInput.Skill key={skill.id} value={skill.id}>
                    {skill.name}
                  </PromptInput.Skill>
                ))}
              </PromptInput.MenuFlyout>
              <PromptInput.MenuFlyout name="sources">
                {sources.map((source) => (
                  <PromptInput.Source
                    attach={source.attach}
                    key={source.id}
                    section={source.section}
                    value={source.id}
                  >
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
          <PromptInput.Submit>Send</PromptInput.Submit>
          <PromptInput.SlashPalette>
            {/* results rendered by consumer normally */}
          </PromptInput.SlashPalette>
          <PromptInput.AtPalette />
        </PromptInput.Root>
      )
    );
  });
}

describe(filterByNameOrDesc, () => {
  it("matches name or description and skips disabled by default", () => {
    const items = [
      { id: "a", name: "Deep Research", desc: "citations" },
      { id: "b", name: "Code Review", desc: "find bugs", disabled: true },
    ];

    expect(
      filterByNameOrDesc(items, "research").map((item) => item.id)
    ).toStrictEqual(["a"]);
    expect(
      filterByNameOrDesc(items, "bugs").map((item) => item.id)
    ).toStrictEqual([]);
    expect(
      filterByNameOrDesc(items, "bugs", { includeDisabled: true }).map(
        (item) => item.id
      )
    ).toStrictEqual(["b"]);
  });
});

describe("attachments helpers", () => {
  it("matches accept patterns and enforces max constraints", () => {
    const image = new File(["x"], "a.png", { type: "image/png" });
    const text = new File(["y"], "b.txt", { type: "text/plain" });
    expect(matchesAccept(image, "image/*")).toBeTruthy();
    expect(matchesAccept(text, "image/*")).toBeFalsy();

    const onError = vi.fn();
    const files = filterIncomingFiles({
      accept: "image/*",
      currentCount: 0,
      files: [image, text],
      maxFiles: 1,
      onError,
    });
    expect(files).toStrictEqual([image]);
  });
});

describe("PromptInput compound", () => {
  it("exports the compound namespace", () => {
    expect(PromptInput.Root).toBeTypeOf("function");
    expect(PromptInput.Editor).toBeTypeOf("function");
    expect(PromptInput.Submit).toBeTypeOf("function");
    expect(PromptInput.SlashPalette).toBeTypeOf("function");
    expect(PromptInput.Provider).toBeTypeOf("function");
  });

  it("renders form, editor, hidden message field, and disabled submit when empty", async () => {
    await renderComposer();

    expect(container.querySelector("form")).not.toBeNull();
    expect(container.querySelector('[role="combobox"]')).not.toBeNull();
    expect(
      container.querySelector('input[type="hidden"][name="message"]')
    ).not.toBeNull();
    expect(container.querySelector('button[type="submit"]')).toHaveProperty(
      "disabled",
      true
    );
  });

  it("submits a structured message and clears by default", async () => {
    const onSubmit = vi.fn();

    await renderComposer(undefined, { onSubmit });

    const editor = container.querySelector(
      '[role="combobox"]'
    ) as HTMLDivElement;
    await act(() => {
      editor.textContent = "Hello world";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submit = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    expect(submit.disabled).toBeFalsy();

    await act(() => {
      submit.click();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    const message = onSubmit.mock.calls[0]?.[1];
    expect(message).toMatchObject({
      text: "Hello world",
      modelId: "opus",
      skillIds: [],
      sourceIds: [],
      attachments: [],
      referencedSources: [],
    });
    expect(editor.textContent).toBe("");
  });

  it("honors defaultPrevented and does not clear", async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    await renderComposer(undefined, { onSubmit });

    const editor = container.querySelector(
      '[role="combobox"]'
    ) as HTMLDivElement;
    await act(() => {
      editor.textContent = "Keep me";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(() => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(editor.textContent).toBe("Keep me");
  });

  it("toggles the action menu and selects a model", async () => {
    const onModelChange = vi.fn();
    await renderComposer(undefined, { onModelChange });

    const trigger = container.querySelector(
      '[aria-haspopup="menu"]'
    ) as HTMLButtonElement;

    await act(() => {
      trigger.click();
    });

    expect(
      container.querySelector('[role="menu"]')?.hasAttribute("hidden")
    ).toBeFalsy();

    const gpt = [...container.querySelectorAll('[role="menuitemradio"]')].find(
      (node) => node.textContent === "GPT"
    ) as HTMLButtonElement;

    await act(() => {
      gpt.click();
    });

    expect(onModelChange).toHaveBeenCalledWith("gpt");
    expect(
      container.querySelector('[role="menu"]')?.hasAttribute("hidden")
    ).toBeTruthy();
  });

  it("awaits async submit before clearing", async () => {
    let resolveSubmit!: () => void;
    // oxlint-disable-next-line promise/avoid-new -- test gate for deferred submit
    const gate = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn(async () => {
      await gate;
    });

    await renderComposer(undefined, { onSubmit });

    const editor = container.querySelector(
      '[role="combobox"]'
    ) as HTMLDivElement;
    await act(() => {
      editor.textContent = "Async";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(() => {
      (
        container.querySelector('button[type="submit"]') as HTMLButtonElement
      ).click();
    });

    expect(editor.textContent).toBe("Async");
    await act(async () => {
      resolveSubmit();
      await gate;
    });
    expect(editor.textContent).toBe("");
  });

  it("exposes stoppable submit while streaming", async () => {
    const onStop = vi.fn();
    await renderComposer(undefined, { status: "streaming", onStop });

    const button = container.querySelector(
      'button[aria-label="Stop"]'
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.type).toBe("button");

    await act(() => {
      button.click();
    });
    expect(onStop).toHaveBeenCalledWith();
  });

  it("lifts state through Provider", async () => {
    function Probe() {
      return (
        <PromptInput.Provider defaultValue="lifted">
          <PromptInput.Root>
            <PromptInput.Editor />
            <PromptInput.Submit />
          </PromptInput.Root>
        </PromptInput.Provider>
      );
    }

    await act(() => {
      root.render(<Probe />);
    });

    expect(
      (container.querySelector('input[type="hidden"]') as HTMLInputElement)
        .value
    ).toBe("lifted");
  });

  it("supports plain single-line editor mode", async () => {
    await act(() => {
      root.render(
        <PromptInput.Root editorMode="plain" multiline={false}>
          <PromptInput.Editor placeholder="Ask…" />
          <PromptInput.Submit />
        </PromptInput.Root>
      );
    });

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.rows).toBe(1);

    await act(() => {
      const native = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      );
      native?.set?.call(textarea, "hi\nthere");
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(textarea.value).toBe("hi there");
  });

  it("syncs FormData hidden fields and messageToFormData", async () => {
    await act(() => {
      root.render(
        <PromptInput.Root
          defaultModelId="opus"
          defaultValue="hello"
          models={models}
          syncHiddenInput
        >
          <PromptInput.Editor />
          <PromptInput.LiveRegion />
          <PromptInput.Submit />
        </PromptInput.Root>
      );
    });

    expect(
      (
        container.querySelector(
          'input[name="modelId"]'
        ) as HTMLInputElement | null
      )?.value
    ).toBe("opus");

    const formData = messageToFormData({
      attachments: [],
      modelId: "opus",
      referencedSources: [{ id: "doc-1", title: "Spec" }],
      skillIds: ["a"],
      sourceIds: [],
      text: "hello",
    });
    expect(formData.get("message")).toBe("hello");
    expect(formData.get("modelId")).toBe("opus");
    expect(formData.getAll("skillIds")).toStrictEqual(["a"]);
  });

  it("manages referenced sources and announces via live region", async () => {
    await act(() => {
      root.render(
        <PromptInput.Root
          defaultReferencedSources={[
            { id: "doc-1", title: "Spec", url: "https://example.com" },
          ]}
        >
          <PromptInput.ReferencedSources>
            <PromptInput.ReferencedSource id="doc-1">
              Spec
              <PromptInput.ReferencedSourceRemove />
            </PromptInput.ReferencedSource>
          </PromptInput.ReferencedSources>
          <PromptInput.LiveRegion />
          <PromptInput.Editor />
          <PromptInput.Submit />
        </PromptInput.Root>
      );
    });

    expect(
      container.querySelector('[data-referenced-source-id="doc-1"]')
    ).not.toBeNull();

    await act(() => {
      (
        container.querySelector(
          '[aria-label="Remove referenced source"]'
        ) as HTMLButtonElement
      ).click();
    });

    expect(
      container.querySelector('[data-referenced-source-id="doc-1"]')
    ).toBeNull();
  });
});

describe("file-meta helpers", () => {
  it("labels extensions, sizes, and text-like files", () => {
    const file = new File(["hi"], "notes.md", { type: "text/markdown" });
    expect(fileExtensionLabel(file)).toBe("md");
    expect(isLikelyTextFile(file)).toBeTruthy();
    expect(formatFileSize(1500)).toBe("1.5 KB");
  });
});

describe("token selection attributes", () => {
  it("marks intersecting tokens with data-selected", () => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    const token = createDefaultTokenElement({
      id: "catalog",
      label: "Product catalog",
      type: "source",
    });
    const text = document.createTextNode("hello");
    editor.append(token, text);
    document.body.append(editor);

    const range = document.createRange();
    range.setStartBefore(token);
    range.setEndAfter(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    markTokenSelectionAttributes(editor);
    expect(Object.hasOwn(token.dataset, "selected")).toBeTruthy();

    selection?.collapse(text, text.length);
    markTokenSelectionAttributes(editor);
    expect(Object.hasOwn(token.dataset, "selected")).toBeFalsy();

    editor.remove();
  });
});
