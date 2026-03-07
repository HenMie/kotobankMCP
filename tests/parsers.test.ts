import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rankCandidates } from "../src/kotobank/ranking.js";
import { parseSearchCandidates } from "../src/kotobank/search-parser.js";
import { parseWordPage } from "../src/kotobank/word-parser.js";

function readFixture(filename: string): string {
  return readFileSync(resolve("tests/fixtures", filename), "utf8");
}

describe("Kotobank parsers", () => {
  it("ranks cat results with primary Japanese dictionaries first", () => {
    const ranked = rankCandidates("猫", parseSearchCandidates(readFixture("search-cat.html")));

    expect(ranked[0]?.dictionaryName).toBe("デジタル大辞泉");
    expect(ranked[1]?.dictionaryName).toBe("精選版 日本国語大辞典");
    expect(ranked[0]?.canonicalUrl).toBe("https://kotobank.jp/word/%E7%8C%AB-594782");
  });

  it("parses canonical url, entries and related terms from a word page", () => {
    const parsed = parseWordPage(readFixture("word-taberu.html"));

    expect(parsed.canonicalUrl).toBe("https://kotobank.jp/word/%E9%A3%9F%E3%81%B9%E3%82%8B-562605");
    expect(parsed.headword).toBe("食べる");
    expect(parsed.reading).toBe("タベル");
    expect(parsed.entriesByAnchor.get("w-562605")?.dictionaryName).toBe("デジタル大辞泉");
    expect(parsed.relatedTerms).toEqual(["当世書生気質", "後撰和歌集"]);
  });
});

