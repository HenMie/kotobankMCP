#!/usr/bin/env node

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ParsedArgs = {
  readonly targetDir: string;
  readonly force: boolean;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const currentFilePath = fileURLToPath(import.meta.url);
  const sourceDir = path.resolve(path.dirname(currentFilePath), "../skills");
  const targetDir = path.resolve(process.cwd(), args.targetDir);

  await ensureDirectoryExists(sourceDir, "skills 源目录不存在");
  await mkdir(targetDir, { recursive: true });
  await copySkillFiles(sourceDir, targetDir, args.force);

  console.error(`Installed Kotobank skills to ${targetDir}`);
}

function parseArgs(rawArgs: readonly string[]): ParsedArgs {
  const force = rawArgs.includes("--force");
  const targetIndex = rawArgs.findIndex((arg) => arg === "--target");
  const targetDir = targetIndex >= 0 ? rawArgs[targetIndex + 1] : rawArgs[0];

  if (!targetDir || targetDir.startsWith("-")) {
    throw new Error(
      "用法: kotobank-mcp-install-skills --target <目录> [--force]",
    );
  }

  return { targetDir, force };
}

async function ensureDirectoryExists(
  directoryPath: string,
  errorMessage: string,
): Promise<void> {
  try {
    const directoryStat = await stat(directoryPath);
    if (!directoryStat.isDirectory()) {
      throw new Error(errorMessage);
    }
  } catch {
    throw new Error(errorMessage);
  }
}

async function copySkillFiles(
  sourceDir: string,
  targetDir: string,
  force: boolean,
): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    await cp(sourcePath, targetPath, { force });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
