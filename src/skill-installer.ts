import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type ParsedInstallArgs = {
  readonly force: boolean;
  readonly targetDir: string;
};

interface InstallSkillsOptions {
  readonly force: boolean;
  readonly sourceDir: string;
  readonly targetDir: string;
}

export function parseInstallArgs(rawArgs: readonly string[]): ParsedInstallArgs {
  const force = rawArgs.includes("--force");
  const targetIndex = rawArgs.findIndex((arg) => arg === "--target");
  const targetDir = targetIndex >= 0 ? rawArgs[targetIndex + 1] : rawArgs[0];

  if (!targetDir || targetDir.startsWith("-")) {
    throw new Error("用法: kotobank-mcp-install-skills --target <目录> [--force]");
  }

  return { force, targetDir };
}

export function resolveBundledSkillsDir(currentFilePath: string): string {
  return path.resolve(path.dirname(currentFilePath), "../.agents/skills");
}

export async function installSkills(options: InstallSkillsOptions): Promise<void> {
  await assertDirectory(options.sourceDir, "skills 源目录不存在");
  await mkdir(options.targetDir, { recursive: true });
  await copySkillEntries(options);
}

async function assertDirectory(directoryPath: string, errorMessage: string): Promise<void> {
  try {
    const directoryStat = await stat(directoryPath);
    if (!directoryStat.isDirectory()) {
      throw new Error(errorMessage);
    }
  } catch {
    throw new Error(errorMessage);
  }
}

async function copySkillEntries(options: InstallSkillsOptions): Promise<void> {
  const entries = await readdir(options.sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(options.sourceDir, entry.name);
    const targetPath = path.join(options.targetDir, entry.name);
    await copyEntry(sourcePath, targetPath, entry.isDirectory(), options.force);
  }
}

async function copyEntry(
  sourcePath: string,
  targetPath: string,
  recursive: boolean,
  force: boolean,
): Promise<void> {
  await cp(sourcePath, targetPath, {
    recursive,
    force,
    errorOnExist: !force,
  });
}
