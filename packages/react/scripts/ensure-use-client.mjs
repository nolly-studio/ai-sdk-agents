#!/usr/bin/env node
/**
 * tsup/esbuild drop "use client" while bundling. Re-assert the directive on
 * public entry files after the build so Next.js client boundaries survive.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const __dirname = import.meta.dirname;
const distRoot = path.resolve(__dirname, "../dist");

const ENTRIES = ["index.js", "data-stream-controller/index.js"];
const DIRECTIVE = '"use client";\n';

for (const relativePath of ENTRIES) {
  const filePath = path.join(distRoot, relativePath);
  const source = readFileSync(filePath, "utf-8");
  const trimmed = source.trimStart();
  if (
    trimmed.startsWith('"use client"') ||
    trimmed.startsWith("'use client'")
  ) {
    continue;
  }
  writeFileSync(filePath, `${DIRECTIVE}${source}`);
  console.log(`ensure-use-client: wrote directive to dist/${relativePath}`);
}
