#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("缺少 npm_execpath，无法运行打包 smoke test");
}

const tempDir = await mkdtemp(path.join(tmpdir(), "kotobank-skill-"));

try {
  const packResult = await runNode([npmCli, "pack", "--json"]);
  const packages = JSON.parse(packResult.stdout);
  const filename = packages[0]?.filename;
  if (!filename) {
    throw new Error("npm pack 未返回 tarball 文件名");
  }

  await runNode([
    npmCli,
    "exec",
    "--yes",
    `--package=./${filename}`,
    "kotobank-mcp-install-skills",
    "--",
    "--target",
    tempDir,
  ]);

  const scriptPath = path.join(
    tempDir,
    "kotobank-japanese-dictionary",
    "scripts",
    "kotobank-cli.mjs",
  );
  const lookupResult = await runNode([
    scriptPath,
    "lookup",
    "--query",
    "食べる",
    "--max-entries",
    "2",
  ]);
  const stdout = lookupResult.stdout.trim();
  if (!stdout) {
    throw new Error(
      `打包 skill CLI 未输出 JSON。stderr: ${lookupResult.stderr.trim() || "<empty>"}`,
    );
  }

  const payload = JSON.parse(stdout);
  if (!Array.isArray(payload.entries) || payload.entries.length === 0) {
    throw new Error("打包 skill CLI 未返回有效 lookup 结果");
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function runNode(args) {
  return execFileAsync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
}
