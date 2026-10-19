import { build } from "esbuild";
await build({
  entryPoints: ["server/b2b/runner-entry.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".runner/runner.cjs",
});
