import { describe, expect, it } from "vitest";

import { PromptInput } from ".";
import { getCollapsedCaretInEditor } from "./editor";

describe("PromptInput (browser)", () => {
  it("exposes the compound namespace", () => {
    expect(PromptInput.Root).toBeTypeOf("function");
    expect(PromptInput.Editor).toBeTypeOf("function");
    expect(PromptInput.SlashPalette).toBeTypeOf("function");
  });

  it("resolves a caret inside a contenteditable host", () => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    document.body.append(editor);
    editor.focus();
    editor.textContent = "/dee";

    const text = editor.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, text.textContent?.length ?? 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const caret = getCollapsedCaretInEditor(editor);
    expect(caret?.before).toBe("/dee");
    editor.remove();
  });
});
