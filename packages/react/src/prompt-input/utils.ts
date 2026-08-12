import type { PromptInputTriggerDefinition } from "./types";

const SLASH_TOKEN_AT_CARET = /\/(?<query>[^\s/]*)$/u;
const SLASH_TOKEN_AFTER_BOUNDARY = /(?:^|\s)\/(?<query>[^\s/]*)$/u;
const AT_TOKEN_AT_CARET = /@(?<query>[^\s@]*)$/u;
const AT_TOKEN_AFTER_BOUNDARY = /(?:^|\s)@(?<query>[^\s@]*)$/u;
const SOLO_TRIGGER_TOKEN = /^(?:\/[^\s/]*|@[^\s@]*)$/u;

const PALETTE_NAV_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "Enter",
  "Tab",
  "Escape",
]);

const DEFAULT_TRIGGERS: readonly PromptInputTriggerDefinition[] = [
  {
    boundaryPattern: SLASH_TOKEN_AFTER_BOUNDARY,
    caretPattern: SLASH_TOKEN_AT_CARET,
    catalog: "skill",
    id: "slash",
  },
  {
    boundaryPattern: AT_TOKEN_AFTER_BOUNDARY,
    caretPattern: AT_TOKEN_AT_CARET,
    catalog: "source",
    id: "at",
    suppressWhen: SLASH_TOKEN_AFTER_BOUNDARY,
  },
];

function isPaletteNavKey(key: string) {
  return PALETTE_NAV_KEYS.has(key);
}

function escapeHtml(value: string) {
  return value.replaceAll(
    /[&<>']/gu,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
      })[char] ?? char
  );
}

function matchesAccept(file: File, accept: string | undefined) {
  if (!accept || accept.trim() === "") {
    return true;
  }

  const patterns = accept
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) {
      return file.type.startsWith(pattern.slice(0, -1));
    }
    if (pattern.startsWith(".")) {
      return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    }
    return file.type === pattern;
  });
}

function resolveTriggers(
  triggers: readonly PromptInputTriggerDefinition[] | undefined
) {
  return triggers ?? DEFAULT_TRIGGERS;
}

export {
  AT_TOKEN_AFTER_BOUNDARY,
  AT_TOKEN_AT_CARET,
  DEFAULT_TRIGGERS,
  escapeHtml,
  isPaletteNavKey,
  matchesAccept,
  PALETTE_NAV_KEYS,
  resolveTriggers,
  SLASH_TOKEN_AFTER_BOUNDARY,
  SLASH_TOKEN_AT_CARET,
  SOLO_TRIGGER_TOKEN,
};
