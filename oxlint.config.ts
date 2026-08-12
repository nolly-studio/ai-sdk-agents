import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

const vitestOverrides = (vitest.overrides ?? []).map((override) => ({
  ...override,
  rules: {
    ...override.rules,
    // Existing M1–M5 tests prioritize behavior clarity over these pedantic rules.
    "vitest/require-mock-type-parameters": "off",
    "vitest/require-top-level-describe": "off",
    "vitest/max-expects": "off",
    "vitest/no-conditional-expect": "off",
    "eslint/prefer-destructuring": "off",
  },
}));

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "apps/web/public/r/**",
    "**/dist/**",
  ],
  rules: {
    // Headless library + INTERFACE.md use function declarations and `onPart`.
    "eslint/func-style": "off",
    "react/function-component-definition": "off",
    "react/jsx-handler-names": "off",
    "eslint/sort-keys": "off",
    // Root-owned external store: setter is intentionally unused.
    "react/hook-use-state": "off",
    "react/react-compiler": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/catch-error-name": "off",
    // TSDoc uses @remarks in the frozen contract surface.
    "jsdoc/check-tag-names": "off",
    // AI SDK `UIDataTypes` and several public unions need `type` aliases.
    "typescript/consistent-type-definitions": "off",
  },
  overrides: vitestOverrides,
});
