import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { installSkills, parseInstallArgs } from "../src/skill-installer.js";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
  tempDirectories.length = 0;
});

describe("parseInstallArgs", () => {
  it("parses target and force", () => {
    expect(parseInstallArgs(["--target", "./skills-root", "--force"])).toEqual({
      targetDir: "./skills-root",
      force: true,
    });
  });
});

describe("installSkills", () => {
  it("copies the full skill directory tree", async () => {
    const sourceDir = await createTempDirectory("skills-source-");
    const targetDir = await createTempDirectory("skills-target-");
    const skillDir = path.join(sourceDir, "kotobank-japanese-dictionary");
    const referencesDir = path.join(skillDir, "references");

    await mkdir(referencesDir, { recursive: true });
    await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: test\n---\n");
    await writeFile(path.join(referencesDir, "example.md"), "example");

    await installSkills({
      sourceDir,
      targetDir,
      force: false,
    });

    await expectFile(
      path.join(targetDir, "kotobank-japanese-dictionary", "SKILL.md"),
      "---\nname: test\n---\n",
    );
    await expectFile(
      path.join(targetDir, "kotobank-japanese-dictionary", "references", "example.md"),
      "example",
    );
  });
});

async function createTempDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}

async function expectFile(filePath: string, expected: string): Promise<void> {
  await expect(readFile(filePath, "utf8")).resolves.toBe(expected);
}
