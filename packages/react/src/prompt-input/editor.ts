import { SOLO_TRIGGER_TOKEN } from "./utils";

type EditorTokenRange = {
  end: number;
  node: Text;
  start: number;
};

type CollapsedCaret = {
  before: string;
  node: Text;
  offset: number;
};

function getCollapsedCaretInEditor(editor: HTMLElement): CollapsedCaret | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  let node: Node = range.startContainer;
  let offset = range.startOffset;

  if (!editor.contains(node)) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const beforeNode = node.childNodes[offset - 1] ?? null;
    const afterNode = node.childNodes[offset] ?? null;

    if (beforeNode?.nodeType === Node.TEXT_NODE) {
      node = beforeNode;
      offset = beforeNode.textContent?.length ?? 0;
    } else if (afterNode?.nodeType === Node.TEXT_NODE) {
      const text = afterNode.textContent ?? "";
      const atTokenEnd =
        offset === 0 &&
        node.childNodes.length === 1 &&
        SOLO_TRIGGER_TOKEN.test(text);
      node = afterNode;
      offset = atTokenEnd ? text.length : 0;
    } else {
      return null;
    }
  }

  if (node.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const textNode = node as Text;
  return {
    before: (textNode.textContent ?? "").slice(0, offset),
    node: textNode,
    offset,
  };
}

function focusEditorEnd(
  editor: HTMLElement,
  savedRange: { current: Range | null }
) {
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  savedRange.current = range.cloneRange();
}

const TOKEN_SELECTOR = "[data-skill], [data-source], [data-token]";

function isTokenElement(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    (Object.hasOwn(node.dataset, "token") ||
      Object.hasOwn(node.dataset, "skill") ||
      Object.hasOwn(node.dataset, "source"))
  );
}

function markTokenStartAttributes(editor: HTMLElement) {
  for (const pill of editor.querySelectorAll<HTMLElement>(TOKEN_SELECTOR)) {
    let atStart = true;
    for (
      let sibling = pill.previousSibling;
      sibling;
      sibling = sibling.previousSibling
    ) {
      if (
        sibling.nodeType === Node.TEXT_NODE &&
        (sibling.textContent ?? "").trim() === ""
      ) {
        continue;
      }
      atStart = false;
      break;
    }
    pill.toggleAttribute("data-start", atStart);
  }
}

/**
 * Mirror DOM selection onto tokens. Native `::selection` often skips
 * `contenteditable=false` pills — `data-selected` is the styling seam.
 */
function markTokenSelectionAttributes(editor: HTMLElement) {
  const pills = editor.querySelectorAll<HTMLElement>(TOKEN_SELECTOR);
  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const inEditor =
    Boolean(range) &&
    Boolean(selection?.anchorNode) &&
    editor.contains(selection?.anchorNode ?? null);

  if (!(inEditor && range && !range.collapsed)) {
    for (const pill of pills) {
      delete pill.dataset.selected;
    }
    return;
  }

  for (const pill of pills) {
    let selected = false;
    try {
      selected = range.intersectsNode(pill);
    } catch {
      selected = false;
    }
    pill.toggleAttribute("data-selected", selected);
  }
}

function getTokenBeforeTextCaret(
  node: Text,
  offset: number
): HTMLElement | null {
  const text = node.textContent ?? "";
  if (offset === 0) {
    return isTokenElement(node.previousSibling) ? node.previousSibling : null;
  }
  // Caret just after the inserted NBSP that follows a token
  if (
    offset === 1 &&
    text.startsWith("\u00A0") &&
    isTokenElement(node.previousSibling)
  ) {
    return node.previousSibling;
  }
  return null;
}

function getTokenBeforeElementCaret(
  node: Node,
  offset: number
): HTMLElement | null {
  const before = node.childNodes[offset - 1] ?? null;
  if (isTokenElement(before)) {
    return before;
  }
  if (
    before?.nodeType === Node.TEXT_NODE &&
    (before.textContent === "\u00A0" || before.textContent === "")
  ) {
    const beforeToken = node.childNodes[offset - 2] ?? before.previousSibling;
    return isTokenElement(beforeToken) ? beforeToken : null;
  }
  return null;
}

/** Token immediately before a collapsed caret (skips trailing `\u00A0`). */
function getTokenBeforeCollapsedCaret(editor: HTMLElement): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }
  if (!editor.contains(selection.anchorNode)) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const { startContainer: node, startOffset: offset } = range;

  if (node.nodeType === Node.TEXT_NODE) {
    return getTokenBeforeTextCaret(node as Text, offset);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return getTokenBeforeElementCaret(node, offset);
  }

  return null;
}

function selectTokenNode(token: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.selectNode(token);
  selection.removeAllRanges();
  selection.addRange(range);
  const editor = token.closest<HTMLElement>(
    '[data-slot="prompt-input-editor"], [contenteditable="true"]'
  );
  if (editor) {
    markTokenSelectionAttributes(editor);
  } else {
    token.toggleAttribute("data-selected", true);
  }
}

function syncEditorValue(
  editor: HTMLElement,
  setValue: (value: string) => void
) {
  setValue(editor.textContent ?? "");
  markTokenStartAttributes(editor);
}

function saveEditorSelection(
  editor: HTMLElement,
  savedRange: { current: Range | null }
) {
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
    savedRange.current = selection.getRangeAt(0).cloneRange();
  }
  markTokenSelectionAttributes(editor);
}

function collectTokenIds(
  editor: HTMLElement | null,
  attr: "skill" | "source"
): string[] {
  if (!editor) {
    return [];
  }

  const selector = attr === "skill" ? "[data-skill]" : "[data-source]";

  return [...editor.querySelectorAll<HTMLElement>(selector)].flatMap((pill) => {
    const id = attr === "skill" ? pill.dataset.skill : pill.dataset.source;
    return id ? [id] : [];
  });
}

function rangeFromSavedOrEnd(
  editor: HTMLElement,
  savedRange: { current: Range | null }
): Range | null {
  const selection = window.getSelection();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
    return selection.getRangeAt(0).cloneRange();
  }

  if (
    savedRange.current &&
    editor.contains(savedRange.current.startContainer)
  ) {
    return savedRange.current.cloneRange();
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
}

export type { CollapsedCaret, EditorTokenRange };
export {
  collectTokenIds,
  focusEditorEnd,
  getCollapsedCaretInEditor,
  getTokenBeforeCollapsedCaret,
  markTokenSelectionAttributes,
  markTokenStartAttributes,
  rangeFromSavedOrEnd,
  saveEditorSelection,
  selectTokenNode,
  syncEditorValue,
};
