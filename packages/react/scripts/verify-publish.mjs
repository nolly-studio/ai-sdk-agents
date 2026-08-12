#!/usr/bin/env node
/**
 * M5 publish-prep verification for @aisdkagents/react.
 *
 * Checks:
 * 1. Expected dist entries exist
 * 2. Fixtures/tests are not published in dist
 * 3. Public entries keep "use client"
 * 4. Public export surface matches the intentional allowlist
 * 5. A clean consumer can import root + subpath from a packed tarball
 */

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const __dirname = import.meta.dirname;
const packageRoot = path.resolve(__dirname, "..");
const distRoot = path.join(packageRoot, "dist");
const require = createRequire(import.meta.url);

const CLIENT_ENTRIES = [
  "index.js",
  "artifact-session/index.js",
  "data-stream-controller/index.js",
  "prompt-input/index.js",
];

const REQUIRED_DIST_FILES = [
  ...CLIENT_ENTRIES,
  "index.d.ts",
  "artifact-session/index.d.ts",
  "data-stream-controller/index.d.ts",
  "prompt-input/index.d.ts",
];

const PUBLIC_EXPORT_ALLOWLIST = new Set([
  "createArtifactSession",
  "DataStreamController",
  "DataStreamControllerHandler",
  "DataStreamControllerRoot",
  "useDataStreamAppend",
  "useDataStreamController",
  "useDataStreamStatus",
]);

function fail(message) {
  console.error(`verify-publish: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function verifyDistShape() {
  for (const relativePath of REQUIRED_DIST_FILES) {
    const absolutePath = path.join(distRoot, relativePath);
    try {
      readFileSync(absolutePath);
    } catch {
      fail(`missing required dist file: ${relativePath}`);
    }
  }

  for (const filePath of walkFiles(distRoot)) {
    const relativePath = path.relative(distRoot, filePath);
    assert(
      !relativePath.includes(`${path.sep}fixtures${path.sep}`),
      `fixtures must not ship in dist: ${relativePath}`
    );
    assert(
      !relativePath.includes(".test."),
      `tests must not ship in dist: ${relativePath}`
    );
  }
}

function verifyUseClient() {
  for (const relativePath of CLIENT_ENTRIES) {
    const source = readFileSync(path.join(distRoot, relativePath), "utf-8");
    const firstStatement = source.trimStart().slice(0, 16);
    assert(
      firstStatement.startsWith('"use client"') ||
        firstStatement.startsWith("'use client'"),
      `"use client" missing at top of dist/${relativePath}`
    );
  }
}

async function verifyExportAllowlist() {
  const mod = await import(pathToFileURL(path.join(distRoot, "index.js")).href);
  const exportNames = Object.keys(mod).toSorted();
  for (const name of exportNames) {
    assert(
      PUBLIC_EXPORT_ALLOWLIST.has(name),
      `unexpected public export: ${name}`
    );
  }
  for (const name of PUBLIC_EXPORT_ALLOWLIST) {
    assert(name in mod, `missing public export: ${name}`);
  }

  assert(
    !("createDataStreamStore" in mod),
    "createDataStreamStore must remain private"
  );
  assert(
    !("createArtifactSessionStore" in mod),
    "createArtifactSessionStore must remain private"
  );
  assert(!("deliverBatch" in mod), "deliverBatch must remain private");
  assert(!("getCommonDeltaType" in mod), "getCommonDeltaType must not return");
}

function verifyPackageMetadata() {
  const pkg = require(path.join(packageRoot, "package.json"));
  assert(pkg.type === "module", "package type must be module");
  assert(pkg.sideEffects === false, "sideEffects must be false");
  assert(
    Array.isArray(pkg.files) &&
      pkg.files.includes("dist") &&
      !pkg.files.includes("src"),
    "files must publish dist (not src)"
  );
  assert(pkg.peerDependencies?.react, "react peerDependency required");
  assert(!pkg.peerDependencies?.ai, "ai must not be a peerDependency in v1");
  assert(
    pkg.private !== true,
    "package must not be private after M6 (ready to publish)"
  );
  assert(
    pkg.publishConfig?.access === "public",
    "publishConfig.access must be public for the scoped package"
  );
  assert(
    typeof pkg.version === "string" && pkg.version !== "0.0.0",
    "version must be bumped from 0.0.0 before publish"
  );

  const rootExport = pkg.exports?.["."];
  assert(
    rootExport?.types?.startsWith("./dist/") &&
      rootExport?.default?.startsWith("./dist/"),
    "root export must point at dist"
  );
  for (const key of [
    "./artifact-session",
    "./data-stream-controller",
    "./prompt-input",
  ]) {
    const subpath = pkg.exports?.[key];
    assert(
      subpath?.types?.startsWith("./dist/") &&
        subpath?.default?.startsWith("./dist/"),
      `${key} export must point at dist`
    );
  }
}

function verifyCleanConsumer() {
  const consumerDir = mkdtempSync(
    path.join(tmpdir(), "ai-sdk-agents-react-consumer-")
  );

  try {
    // Prefer plain `npm pack` over `--json`: npm 10/11/12 disagree on JSON shape
    // (array vs object vs package-name map). The tarball name is always the last
    // non-empty stdout line.
    const packOutput = execFileSync("npm", ["pack"], {
      cwd: packageRoot,
      encoding: "utf-8",
    });
    let filename;
    for (const line of packOutput.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        filename = trimmed;
      }
    }
    assert(
      typeof filename === "string" && filename.endsWith(".tgz"),
      `npm pack did not emit a tarball name (got ${JSON.stringify(filename)})`
    );
    const tarball = path.join(packageRoot, filename);

    writeFileSync(
      path.join(consumerDir, "package.json"),
      JSON.stringify(
        {
          dependencies: {
            "@aisdkagents/react": `file:${tarball}`,
            react: "^19.0.0",
          },
          name: "clean-consumer",
          private: true,
          type: "module",
        },
        null,
        2
      )
    );

    execFileSync("npm", ["install", "--ignore-scripts"], {
      cwd: consumerDir,
      encoding: "utf-8",
      stdio: "pipe",
    });

    writeFileSync(
      path.join(consumerDir, "smoke.mjs"),
      `
import {
  createArtifactSession,
  DataStreamController,
  DataStreamControllerHandler,
  DataStreamControllerRoot,
  useDataStreamAppend,
} from "@aisdkagents/react";
import * as artifactSession from "@aisdkagents/react/artifact-session";
import * as subpath from "@aisdkagents/react/data-stream-controller";
import * as promptInput from "@aisdkagents/react/prompt-input";

if (typeof DataStreamController.Root !== "function") {
  throw new Error("DataStreamController.Root missing");
}
if (typeof DataStreamControllerHandler !== "function") {
  throw new Error("DataStreamControllerHandler missing");
}
if (typeof DataStreamControllerRoot !== "function") {
  throw new Error("DataStreamControllerRoot missing");
}
if (typeof useDataStreamAppend !== "function") {
  throw new Error("useDataStreamAppend missing");
}
if (typeof createArtifactSession !== "function") {
  throw new Error("createArtifactSession missing");
}
if (typeof artifactSession.createArtifactSession !== "function") {
  throw new Error("artifact-session subpath missing");
}
if (typeof subpath.DataStreamController.Handler !== "function") {
  throw new Error("subpath Handler missing");
}
if (typeof promptInput.PromptInput.Root !== "function") {
  throw new Error("prompt-input PromptInput.Root missing");
}
if (typeof promptInput.usePromptInputContext !== "function") {
  throw new Error("prompt-input usePromptInputContext missing");
}

console.log("clean-consumer ok");
`
    );

    const smoke = execFileSync("node", ["smoke.mjs"], {
      cwd: consumerDir,
      encoding: "utf-8",
    });
    assert(smoke.includes("clean-consumer ok"), "clean consumer smoke failed");
  } finally {
    rmSync(consumerDir, { force: true, recursive: true });
    for (const entry of readdirSync(packageRoot)) {
      if (entry.endsWith(".tgz")) {
        rmSync(path.join(packageRoot, entry), { force: true });
      }
    }
  }
}

async function main() {
  verifyPackageMetadata();
  verifyDistShape();
  verifyUseClient();
  await verifyExportAllowlist();
  verifyCleanConsumer();

  if (process.exitCode) {
    console.error("verify-publish: FAILED");
    process.exit(process.exitCode);
  }

  console.log("verify-publish: ok");
}

await main();
