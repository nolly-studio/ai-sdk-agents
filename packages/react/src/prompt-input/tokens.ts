import type { EditorTokenRange } from "./editor";
import type { CreateTokenElementOptions } from "./types";

function createDefaultTokenElement({
  id,
  label,
  type,
}: CreateTokenElementOptions): HTMLElement {
  const element = document.createElement("span");
  element.setAttribute("contenteditable", "false");
  element.dataset.token = type;
  if (type === "skill") {
    element.dataset.skill = id;
  } else if (type === "source") {
    element.dataset.source = id;
  } else {
    element.dataset.tokenId = id;
  }

  const labelEl = document.createElement("span");
  labelEl.dataset.slot = "prompt-input-token-label";
  labelEl.textContent = type === "skill" ? `/${label}` : label;

  // No remove control — contenteditable=false tokens delete as atoms via Backspace.
  // Consumers that want a click-to-remove affordance can add [data-remove] via
  // createTokenElement; Root still wires removeTokenNearest for that path.
  element.append(labelEl);
  return element;
}

function insertTokenOverRange(
  editor: HTMLElement,
  range: Range,
  token: HTMLElement,
  savedRange: { current: Range | null },
  onSync: () => void
) {
  range.deleteContents();
  range.insertNode(token);
  const space = document.createTextNode("\u00A0");
  token.after(space);
  const after = document.createRange();
  after.setStartAfter(space);
  after.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(after);
  editor.focus();
  savedRange.current = after.cloneRange();
  onSync();
}

function removeTokenRange(
  editor: HTMLElement,
  tokenRef: { current: EditorTokenRange | null },
  caretPattern: RegExp
): Range | null {
  const token = tokenRef.current;
  if (
    token?.node.isConnected &&
    editor.contains(token.node) &&
    token.end <= (token.node.textContent?.length ?? 0)
  ) {
    const range = document.createRange();
    range.setStart(token.node, token.start);
    range.setEnd(token.node, token.end);
    return range;
  }

  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    return null;
  }

  const caret = selection.getRangeAt(0);
  const node = caret.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !editor.contains(node)) {
    return null;
  }

  const before = (node.textContent ?? "").slice(0, caret.startOffset);
  const match = before.match(caretPattern);
  if (!match) {
    return null;
  }

  const range = document.createRange();
  range.setStart(node, caret.startOffset - match[0].length);
  range.setEnd(node, caret.startOffset);
  return range;
}

function removeTokenElement(pill: HTMLElement, onSync: () => void) {
  const separator = pill.nextSibling;
  if (
    separator &&
    separator.nodeType === Node.TEXT_NODE &&
    separator.textContent?.startsWith("\u00A0")
  ) {
    const rest = separator.textContent.slice(1);
    if (rest) {
      separator.textContent = rest;
    } else {
      separator.remove();
    }
  }
  pill.remove();
  onSync();
}

export {
  createDefaultTokenElement,
  insertTokenOverRange,
  removeTokenElement,
  removeTokenRange,
};
