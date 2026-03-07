import { describe, expect, it } from "vitest";

import { rankCandidates } from "../src/kotobank/ranking.js";
import { parseSearchCandidates } from "../src/kotobank/search-parser.js";
import { loadFixture } from "./helpers.js";

describe("parseSearchCandidates", () => {
  it("解析 search 结果并规范化 canonical URL", () => {
    const candidates = parseSearchCandidates(loadFixture("search-science.html"));

    expect(candidates).toHaveLength(5);
    expect(candidates[0]).toMatchObject({
      title: "科学【かがく】",
      dictionaryName: "百科事典マイペディア",
      canonicalUrl: "https://kotobank.jp/word/%E7%A7%91%E5%AD%A6-43288",
      anchorId: "w-1733803",
      pathType: "word",
      pathHeadword: "科学",
    });
    expect(candidates[4]?.canonicalUrl).toBe("https://kotobank.jp/jaitword/%E7%A7%91%E5%AD%A6");
  });
});

describe("rankCandidates", () => {
  it("让猫的单语词典结果排在多语词典前面", () => {
    const candidates = parseSearchCandidates(loadFixture("search-cat.html"));
    const ranked = rankCandidates("猫", candidates);

    expect(ranked[0]).toMatchObject({
      dictionaryName: "デジタル大辞泉",
      canonicalUrl: "https://kotobank.jp/word/%E7%8C%AB-594782",
    });
    expect(ranked[1]).toMatchObject({
      dictionaryName: "精選版 日本国語大辞典",
      canonicalUrl: "https://kotobank.jp/word/%E7%8C%AB-594782",
    });
    expect(ranked[0]!.score).toBeGreaterThan(ranked[3]!.score);
  });
});
