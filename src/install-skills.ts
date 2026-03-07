#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  installSkills,
  parseInstallArgs,
  resolveBundledSkillsDir,
} from "./skill-installer.js";

async function main(): Promise<void> {
  const args = parseInstallArgs(process.argv.slice(2));
  const currentFilePath = fileURLToPath(import.meta.url);
  const sourceDir = resolveBundledSkillsDir(currentFilePath);
  const targetDir = path.resolve(process.cwd(), args.targetDir);

  await installSkills({
    sourceDir,
    targetDir,
    force: args.force,
  });

  console.error(`Installed Kotobank skills to ${targetDir}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
