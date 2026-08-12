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
  // Shared React contexts (e.g. DataStreamControllerContext) must be a single
  // module instance across subpath entries. With splitting: false, each entry
  // inlines its own createContext — Root from ./data-stream-controller and
  // Stream from ./artifact-session then fail the "within Root" guard.
  splitting: true,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  external: ["react", "react/jsx-runtime"],
  // "use client" is restored by scripts/ensure-use-client.mjs after build.
  // esbuild drops module-level directives while bundling.
});
