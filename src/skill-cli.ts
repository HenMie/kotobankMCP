import { fileURLToPath } from "node:url";

import { KotobankError } from "./errors.js";
import { createDefaultKotobankService } from "./runtime-service.js";
import type {
  DictionaryScope,
  KotobankService,
  LookupParams,
  SearchParams,
} from "./types.js";

interface OutputWriter {
  write(chunk: string): unknown;
}

interface CliContext {
  readonly argv: readonly string[];
  readonly service: KotobankService;
  readonly stderr: OutputWriter;
  readonly stdout: OutputWriter;
}

interface CliErrorShape {
  readonly code: string;
  readonly message: string;
}

class CliError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CliError";
  }
}

const HELP_TEXT = `Kotobank skill CLI

Usage:
  kotobank-cli.mjs lookup --query <text> [--max-entries <n>] [--include-excerpt]
                         [--canonical-url <url>] [--anchor-id <id>]
                         [--preferred-dictionary <name> ...]
  kotobank-cli.mjs search --query <text> [--dictionary-scope <jp-monolingual|all>]
                         [--max-results <n>]
`;

export async function runCli(context: CliContext): Promise<number> {
  try {
    const command = parseCommand(context.argv);
    if (command === "help") {
      writeLine(context.stdout, HELP_TEXT);
      return 0;
    }

    const payload = command === "lookup"
      ? await context.service.lookup(parseLookupParams(context.argv.slice(1)))
      : await context.service.search(parseSearchParams(context.argv.slice(1)));
    writeJson(context.stdout, payload);
    return 0;
  } catch (error) {
    writeJson(context.stderr, { error: normalizeCliError(error) });
    return 1;
  }
}

function parseCommand(argv: readonly string[]): "help" | "lookup" | "search" {
  const [command] = argv;
  if (!command || command === "help" || command === "--help") {
    return "help";
  }
  if (command === "lookup" || command === "search") {
    return command;
  }

  throw new CliError("CLI_USAGE_ERROR", `未知子命令：${command}`);
}

function parseLookupParams(args: readonly string[]): LookupParams {
  let anchorId: string | undefined;
  let canonicalUrl: string | undefined;
  let includeExcerpt = false;
  let maxEntries: number | undefined;
  const preferredDictionaries: string[] = [];
  let query: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    switch (flag) {
      case "--anchor-id":
        anchorId = readFlagValue(args, index, flag);
        index += 1;
        break;
      case "--canonical-url":
        canonicalUrl = readFlagValue(args, index, flag);
        index += 1;
        break;
      case "--include-excerpt":
        includeExcerpt = true;
        break;
      case "--max-entries":
        maxEntries = parsePositiveInteger(readFlagValue(args, index, flag), flag);
        index += 1;
        break;
      case "--preferred-dictionary":
        preferredDictionaries.push(readFlagValue(args, index, flag));
        index += 1;
        break;
      case "--query":
        query = readFlagValue(args, index, flag);
        index += 1;
        break;
      default:
        throw new CliError("CLI_USAGE_ERROR", `未知参数：${flag}`);
    }
  }

  if (!query) {
    throw new CliError("CLI_USAGE_ERROR", "缺少必填参数 --query");
  }

  return {
    query,
    ...(anchorId ? { anchorId } : {}),
    ...(canonicalUrl ? { canonicalUrl } : {}),
    ...(includeExcerpt ? { includeExcerpt } : {}),
    ...(typeof maxEntries === "number" ? { maxEntries } : {}),
    ...(preferredDictionaries.length ? { preferredDictionaries } : {}),
  };
}

function parseSearchParams(args: readonly string[]): SearchParams {
  let dictionaryScope: DictionaryScope | undefined;
  let maxResults: number | undefined;
  let query: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    switch (flag) {
      case "--dictionary-scope":
        dictionaryScope = parseDictionaryScope(readFlagValue(args, index, flag));
        index += 1;
        break;
      case "--max-results":
        maxResults = parsePositiveInteger(readFlagValue(args, index, flag), flag);
        index += 1;
        break;
      case "--query":
        query = readFlagValue(args, index, flag);
        index += 1;
        break;
      default:
        throw new CliError("CLI_USAGE_ERROR", `未知参数：${flag}`);
    }
  }

  if (!query) {
    throw new CliError("CLI_USAGE_ERROR", "缺少必填参数 --query");
  }

  return {
    query,
    ...(dictionaryScope ? { dictionaryScope } : {}),
    ...(typeof maxResults === "number" ? { maxResults } : {}),
  };
}

function parseDictionaryScope(value: string): DictionaryScope {
  if (value === "jp-monolingual" || value === "all") {
    return value;
  }

  throw new CliError(
    "CLI_USAGE_ERROR",
    `--dictionary-scope 仅支持 jp-monolingual 或 all：${value}`,
  );
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError("CLI_USAGE_ERROR", `${flag} 需要正整数：${value}`);
  }

  return parsed;
}

function readFlagValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CliError("CLI_USAGE_ERROR", `${flag} 缺少值`);
  }

  return value;
}

function writeJson(writer: OutputWriter, payload: unknown): void {
  writeLine(writer, JSON.stringify(payload, null, 2));
}

function writeLine(writer: OutputWriter, value: string): void {
  writer.write(`${value}\n`);
}

function normalizeCliError(error: unknown): CliErrorShape {
  if (error instanceof CliError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof KotobankError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: "CLI_ERROR", message: error.message };
  }

  return { code: "CLI_ERROR", message: "发生未知错误" };
}

async function main(): Promise<void> {
  const exitCode = await runCli({
    argv: process.argv.slice(2),
    service: createDefaultKotobankService(),
    stdout: process.stdout,
    stderr: process.stderr,
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
