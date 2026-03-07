#!/usr/bin/env node

import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";

import { build } from "esbuild";

const outputFile = path.resolve(
  ".agents/skills/kotobank-japanese-dictionary/scripts/kotobank-cli.mjs",
);

await mkdir(path.dirname(outputFile), { recursive: true });
await build({
  entryPoints: [path.resolve("src/skill-cli-main.ts")],
  outfile: outputFile,
  bundle: true,
  format: "esm",
  legalComments: "none",
  minify: true,
  platform: "node",
  target: "node20",
  banner: {
    js: [
      "#!/usr/bin/env node",
      'import { createRequire as __createRequire } from "node:module";',
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
});
await chmod(outputFile, 0o755);
