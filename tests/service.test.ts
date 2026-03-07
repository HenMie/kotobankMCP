import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { KotobankNotFoundError } from "../src/errors.js";
import { createKotobankService } from "../src/kotobank/service.js";
import { createStaticFetcher } from "./helpers.js";

function readFixture(filename: string): string {
  return readFileSync(resolve("tests/fixtures", filename), "utf8");
}

function createFixtureFetcher() {
  const responses = new Map<string, string>([
    ["https://kotobank.jp/search?q=%E7%A7%91%E5%AD%A6&t=all", readFixture("search-science.html")],
    ["https://kotobank.jp/search?q=%E9%A3%9F%E3%81%B9%E3%82%8B&t=all", readFixture("search-taberu.html")],
    ["https://kotobank.jp/search?q=%E7%A9%BA%E8%AA%9E&t=all", "<html><body><section class=\"searchSerp\"></section></body></html>"],
    ["https://kotobank.jp/word/%E9%A3%9F%E3%81%B9%E3%82%8B-562605", readFixture("word-taberu.html")],
  ]);

  return {
    fetch: async (url: string): Promise<string> => {
      const html = responses.get(url);
      if (!html) {
        throw new Error(`Missing fixture for ${url}`);
      }

      return html;
    },
  };
}

function buildSearchHtml(
  candidates: ReadonlyArray<{
    readonly href: string;
    readonly title: string;
    readonly dictionaryName: string;
  }>,
): string {
  const results = candidates.map((candidate) => `
    <dl>
      <dt><h4><a href="${candidate.href}">${candidate.title}</a></h4></dt>
      <dd class="dictionary_name">${candidate.dictionaryName}</dd>
    </dl>
  `).join("");

  return `<!doctype html><html><body><section class="searchSerp">${results}</section></body></html>`;
}

function buildWordHtml(options: {
  readonly canonicalUrl: string;
  readonly anchorId: string;
  readonly dictionaryName: string;
  readonly title: string;
  readonly descriptionText: string;
}): string {
  return `<!doctype html>
    <html>
      <head><link rel="canonical" href="${options.canonicalUrl}"></head>
      <body>
        <h1><span>（読み）カリゴ</span>仮語</h1>
        <div class="page_link_marker" id="${options.anchorId}"></div>
        <article class="dictype">
          <h2><a>${options.dictionaryName}</a></h2>
          <div class="ex"><h3>${options.title}</h3></div>
          <section class="description">${options.descriptionText}</section>
          <p class="source"><cite>テスト出典</cite></p>
        </article>
      </body>
    </html>`;
}

describe("Kotobank service", () => {
  it("returns the science canonical candidate from search", async () => {
    const service = createKotobankService({ htmlFetcher: createFixtureFetcher() });
    const result = await service.search({ query: "科学" });

    expect(result.candidates[0]?.canonicalUrl).toBe("https://kotobank.jp/word/%E7%A7%91%E5%AD%A6-43288");
    expect(result.candidates[0]?.dictionaryName).toBe("デジタル大辞泉");
  });

  it("returns daijisen and nikkoku entries for 食べる lookup", async () => {
    const service = createKotobankService({ htmlFetcher: createFixtureFetcher() });
    const result = await service.lookup({ query: "食べる", maxEntries: 2 });

    expect(result.needsDisambiguation).toBe(false);
    expect(result.entries.map((entry) => entry.dictionaryName)).toEqual([
      "デジタル大辞泉",
      "精選版 日本国語大辞典",
    ]);
  });

  it("returns disambiguation payload instead of throwing on tied candidates", async () => {
    const service = createKotobankService({
      htmlFetcher: createStaticFetcher({
        "https://kotobank.jp/search?q=%E4%BB%AE%E8%AA%9E&t=all": readFixture("search-ambiguous.html"),
      }),
    });
    const result = await service.lookup({ query: "仮語" });

    expect(result.needsDisambiguation).toBe(true);
    expect(result.entries).toEqual([]);
    expect(result.candidates).toHaveLength(2);
  });

  it("resolves a disambiguated candidate when canonicalUrl and anchorId are provided", async () => {
    const service = createKotobankService({
      htmlFetcher: createStaticFetcher({
        "https://kotobank.jp/search?q=%E4%BB%AE%E8%AA%9E&t=all": readFixture("search-ambiguous.html"),
        "https://kotobank.jp/word/%E4%BB%AE%E8%AA%9E-100": buildWordHtml({
          canonicalUrl: "https://kotobank.jp/word/%E4%BB%AE%E8%AA%9E-100",
          anchorId: "w-100",
          dictionaryName: "デジタル大辞泉",
          title: "仮語【かりご】",
          descriptionText: "仮語その1",
        }),
        "https://kotobank.jp/word/%E4%BB%AE%E8%AA%9E-200": buildWordHtml({
          canonicalUrl: "https://kotobank.jp/word/%E4%BB%AE%E8%AA%9E-200",
          anchorId: "w-200",
          dictionaryName: "デジタル大辞泉",
          title: "仮語【かりご】",
          descriptionText: "仮語其二",
        }),
      }),
    });
    const result = await service.lookup({
      query: "仮語",
      canonicalUrl: "https://kotobank.jp/word/%E4%BB%AE%E8%AA%9E-200",
      anchorId: "w-200",
    });

    expect(result.needsDisambiguation).toBe(false);
    expect(result.canonicalUrl).toBe("https://kotobank.jp/word/%E4%BB%AE%E8%AA%9E-200");
    expect(result.entries[0]).toMatchObject({
      anchorId: "w-200",
      title: "仮語【かりご】",
    });
  });

  it("uses request preferredDictionaries when choosing the lookup page", async () => {
    const service = createKotobankService({
      htmlFetcher: createStaticFetcher({
        "https://kotobank.jp/search?q=%E8%AA%9E&t=all": buildSearchHtml([
          {
            href: "/word/%E8%AA%9E-1#w-1",
            title: "語【ご】",
            dictionaryName: "デジタル大辞泉",
          },
          {
            href: "/word/%E8%AA%9E-2#w-2",
            title: "語【ご】",
            dictionaryName: "精選版 日本国語大辞典",
          },
        ]),
        "https://kotobank.jp/word/%E8%AA%9E-1": buildWordHtml({
          canonicalUrl: "https://kotobank.jp/word/%E8%AA%9E-1",
          anchorId: "w-1",
          dictionaryName: "デジタル大辞泉",
          title: "語【ご】",
          descriptionText: "語の説明A",
        }),
        "https://kotobank.jp/word/%E8%AA%9E-2": buildWordHtml({
          canonicalUrl: "https://kotobank.jp/word/%E8%AA%9E-2",
          anchorId: "w-2",
          dictionaryName: "精選版 日本国語大辞典",
          title: "語【ご】",
          descriptionText: "語の説明B",
        }),
      }),
    });
    const result = await service.lookup({
      query: "語",
      preferredDictionaries: ["精選版 日本国語大辞典"],
    });

    expect(result.needsDisambiguation).toBe(false);
    expect(result.canonicalUrl).toBe("https://kotobank.jp/word/%E8%AA%9E-2");
    expect(result.entries[0]?.dictionaryName).toBe("精選版 日本国語大辞典");
  });

  it("reports full candidate count for search results beyond the lookup window", async () => {
    const candidates = Array.from({ length: 25 }, (_, index) => ({
      href: `/word/%E8%AA%9E-${index}#w-${index}`,
      title: `語【ご】${index}`,
      dictionaryName: `辞典${index}`,
    }));
    const service = createKotobankService({
      htmlFetcher: createStaticFetcher({
        "https://kotobank.jp/search?q=%E8%AA%9E&t=all": buildSearchHtml(candidates),
      }),
    });
    const result = await service.search({
      query: "語",
      dictionaryScope: "all",
      maxResults: 20,
    });

    expect(result.totalCandidates).toBe(25);
    expect(result.candidates).toHaveLength(20);
  });

  it("throws not found when no candidate exists", async () => {
    const service = createKotobankService({ htmlFetcher: createFixtureFetcher() });

    await expect(service.lookup({ query: "空語" })).rejects.toBeInstanceOf(KotobankNotFoundError);
  });
});
