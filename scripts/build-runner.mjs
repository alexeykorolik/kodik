import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 1. Sandboxed learning-Python executor (also translates blocks; see runner-entry.ts).
await build({
  entryPoints: ["server/b2b/runner-entry.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".runner/runner.cjs",
});
// 2. Rules shared with the browser (modes, learning config, draft shape), imported by the API.
await build({
  entryPoints: ["src/adaptive/serverShared.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".runner/adaptive.mjs",
});
// 3. Headless real-Blockly load check, run in its own restricted process at publication time.
// Blockly's Node entry pulls in jsdom only for XML; Kodik stores JSON, so the checker uses the
// plain core build and stays a small single file readable under --allow-fs-read.
const blocklyWithoutJsdom = {
  name: "blockly-core-without-jsdom",
  setup(b) {
    b.onResolve({ filter: /^blockly\/core$/ }, () => ({ path: fileURLToPath(new URL("../node_modules/blockly/blockly_compressed.js", import.meta.url)) }));
  },
};
await build({
  entryPoints: ["server/b2b/blockly-check-entry.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".runner/blockly-check.cjs",
  plugins: [blocklyWithoutJsdom],
});

// Semantic identity of the checking chain. Approvals bind to these, not to bundle bytes,
// so a rebuild that does not change learning semantics does not invalidate publications.
const digest = (files) => {
  const h = createHash("sha256");
  for (const f of files) h.update(f).update("\0").update(readFileSync(f)).update("\0");
  return h.digest("hex").slice(0, 32);
};
const python = digest([
  "src/pythonRuntime.ts",
  "src/pythonExecution.ts",
  "src/pythonStructure.ts",
  "src/b2b/learningRules.json",
  "src/b2b/learningRules.ts",
  "server/b2b/runner-entry.ts",
  "src/shared/outputMatch.mjs",
]);
const translatorSource = readFileSync("src/adaptive/blockProgram.ts", "utf8");
const translatorVersion = /TRANSLATOR_VERSION = '([^']+)'/.exec(translatorSource)?.[1] ?? "unknown";
const blocks = `${translatorVersion}:${digest(["src/adaptive/blockProgram.ts", "src/adaptive/blocklyBlocks.ts", "src/blocks.ts"])}`;
writeFileSync(
  ".runner/runtime.json",
  JSON.stringify({ python: `py:${python}`, blocks: `bl:${blocks}`, built_at: new Date().toISOString() }, null, 2),
);
