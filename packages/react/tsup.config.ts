import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "artifact-session/index": "src/artifact-session/index.ts",
    "data-stream-controller/index": "src/data-stream-controller/index.ts",
    "prompt-input/index": "src/prompt-input/index.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  external: ["react", "react/jsx-runtime"],
  // "use client" is restored by scripts/ensure-use-client.mjs after build.
  // esbuild drops module-level directives while bundling.
});
