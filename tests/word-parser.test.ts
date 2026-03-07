import { describe, expect, it } from "vitest";

import { parseWordPage } from "../src/kotobank/word-parser.js";
import { loadFixture } from "./helpers.js";

describe("parseWordPage", () => {
  it("按 anchor 抽取 article、来源和相关词", () => {
    const parsed = parseWordPage(loadFixture("word-taberu.html"));

    expect(parsed.headword).toBe("食べる");
    expect(parsed.reading).toBe("タベル");
    expect(parsed.relatedTerms).toEqual(["当世書生気質", "後撰和歌集"]);

    const daijisen = parsed.entriesByAnchor.get("w-562605");
    expect(daijisen).toMatchObject({
      dictionaryName: "デジタル大辞泉",
      title: "た・べる【食べる】",
      sourceLabel: "小学館",
      sourceUrl: "https://daijisen.jp/",
    });

    const nikkoku = parsed.entriesByAnchor.get("w-2041086");
    expect(nikkoku).toMatchObject({
      dictionaryName: "精選版 日本国語大辞典",
      title: "た・べる【食】",
      sourceUrl: "https://kotobank.jp/dictionary/nikkokuseisen/",
    });
  });
});
