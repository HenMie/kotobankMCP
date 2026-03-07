import { describe, expect, it } from "vitest";
import { MemoryCache } from "../src/cache.js";
import { createHtmlFetcher } from "../src/http.js";
import { createKotobankService } from "../src/kotobank/service.js";

const runLiveTests = process.env.RUN_LIVE_KOTOBANK_TESTS === "1";

describe.runIf(runLiveTests)("Kotobank live smoke", () => {
  it("searches 科学 against the live site", async () => {
    const service = createKotobankService({
      htmlFetcher: createHtmlFetcher({ cache: new MemoryCache<string>() }),
    });
    const result = await service.search({ query: "科学" });

    expect(result.candidates[0]?.canonicalUrl).toBe("https://kotobank.jp/word/%E7%A7%91%E5%AD%A6-43288");
  });

  it("looks up 食べる against the live site", async () => {
    const service = createKotobankService({
      htmlFetcher: createHtmlFetcher({ cache: new MemoryCache<string>() }),
    });
    const result = await service.lookup({ query: "食べる", maxEntries: 2 });

    expect(result.needsDisambiguation).toBe(false);
    expect(result.entries.some((entry) => entry.dictionaryName === "デジタル大辞泉")).toBe(true);
    expect(result.entries.some((entry) => entry.dictionaryName === "精選版 日本国語大辞典")).toBe(true);
  });
});

