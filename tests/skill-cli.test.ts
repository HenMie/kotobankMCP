import { describe, expect, it } from "vitest";

import { KotobankNotFoundError } from "../src/errors.js";
import { runCli } from "../src/skill-cli.js";
import type { KotobankService, LookupParams, SearchParams } from "../src/types.js";

describe("skill CLI", () => {
  it("runs search and prints JSON to stdout", async () => {
    const stdout = createWriter();
    const stderr = createWriter();
    const searchCalls: SearchParams[] = [];
    const exitCode = await runCli({
      argv: ["search", "--query", "科学", "--dictionary-scope", "all", "--max-results", "5"],
      service: createService({
        search: async (params) => {
          searchCalls.push(params);
          return {
            query: params.query,
            totalCandidates: 1,
            candidates: [{
              title: "科学【かがく】",
              dictionaryName: "デジタル大辞泉",
              canonicalUrl: "https://kotobank.jp/word/%E7%A7%91%E5%AD%A6-43288",
              anchorId: "w-1",
              pathType: "word",
              score: 10,
            }],
          };
        },
      }),
      stderr,
      stdout,
    });

    expect(exitCode).toBe(0);
    expect(searchCalls).toEqual([{
      query: "科学",
      dictionaryScope: "all",
      maxResults: 5,
    }]);
    expect(JSON.parse(stdout.value)).toMatchObject({
      query: "科学",
      totalCandidates: 1,
    });
    expect(stderr.value).toBe("");
  });

  it("runs lookup with bundled-style flags", async () => {
    const stdout = createWriter();
    const stderr = createWriter();
    const lookupCalls: LookupParams[] = [];
    const exitCode = await runCli({
      argv: [
        "lookup",
        "--query",
        "食べる",
        "--max-entries",
        "2",
        "--include-excerpt",
        "--canonical-url",
        "https://kotobank.jp/word/%E9%A3%9F%E3%81%B9%E3%82%8B-562605",
        "--anchor-id",
        "w-562605",
        "--preferred-dictionary",
        "デジタル大辞泉",
        "--preferred-dictionary",
        "精選版 日本国語大辞典",
      ],
      service: createService({
        lookup: async (params) => {
          lookupCalls.push(params);
          return {
            headword: "食べる",
            reading: "たべる",
            canonicalUrl: "https://kotobank.jp/word/%E9%A3%9F%E3%81%B9%E3%82%8B-562605",
            entries: [],
            relatedTerms: [],
            needsDisambiguation: false,
          };
        },
      }),
      stderr,
      stdout,
    });

    expect(exitCode).toBe(0);
    expect(lookupCalls).toEqual([{
      query: "食べる",
      maxEntries: 2,
      includeExcerpt: true,
      canonicalUrl: "https://kotobank.jp/word/%E9%A3%9F%E3%81%B9%E3%82%8B-562605",
      anchorId: "w-562605",
      preferredDictionaries: ["デジタル大辞泉", "精選版 日本国語大辞典"],
    }]);
    expect(JSON.parse(stdout.value)).toMatchObject({
      headword: "食べる",
      needsDisambiguation: false,
    });
    expect(stderr.value).toBe("");
  });

  it("returns non-zero when required options are missing", async () => {
    const stdout = createWriter();
    const stderr = createWriter();
    const exitCode = await runCli({
      argv: ["lookup"],
      service: createService({}),
      stderr,
      stdout,
    });

    expect(exitCode).toBe(1);
    expect(stdout.value).toBe("");
    expect(JSON.parse(stderr.value)).toEqual({
      error: {
        code: "CLI_USAGE_ERROR",
        message: "缺少必填参数 --query",
      },
    });
  });

  it("returns non-zero and writes stderr on service errors", async () => {
    const stdout = createWriter();
    const stderr = createWriter();
    const exitCode = await runCli({
      argv: ["lookup", "--query", "空語"],
      service: createService({
        lookup: async () => {
          throw new KotobankNotFoundError("Kotobank 未找到词条：空語");
        },
      }),
      stderr,
      stdout,
    });

    expect(exitCode).toBe(1);
    expect(stdout.value).toBe("");
    expect(JSON.parse(stderr.value)).toEqual({
      error: {
        code: "KOTOBANK_NOT_FOUND",
        message: "Kotobank 未找到词条：空語",
      },
    });
  });
});

function createService(overrides: {
  readonly lookup?: ((params: LookupParams) => ReturnType<KotobankService["lookup"]>) | undefined;
  readonly search?: ((params: SearchParams) => ReturnType<KotobankService["search"]>) | undefined;
}): KotobankService {
  return {
    lookup: overrides.lookup ?? (async () => ({
      headword: "unused",
      canonicalUrl: "https://kotobank.jp/word/unused",
      entries: [],
      relatedTerms: [],
      needsDisambiguation: false,
    })),
    search: overrides.search ?? (async () => ({
      query: "unused",
      totalCandidates: 0,
      candidates: [],
    })),
  };
}

function createWriter(): { readonly value: string; write(chunk: string): boolean } {
  let value = "";

  return {
    get value() {
      return value;
    },
    write(chunk: string) {
      value += chunk;
      return true;
    },
  };
}
