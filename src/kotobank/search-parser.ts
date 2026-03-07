import { load } from "cheerio";
import type { Element as DomElement } from "domhandler";

import { KotobankParseError } from "../errors.js";
import type { SearchCandidateBase } from "../types.js";
import { cleanText } from "../text.js";
import { normalizeResultUrl } from "./url.js";

export function parseSearchCandidates(html: string): ReadonlyArray<SearchCandidateBase> {
  const $ = load(html);
  if (!$("section.searchSerp").length) {
    throw new KotobankParseError("搜索页缺少 section.searchSerp");
  }

  const results = $("section.searchSerp dl").toArray();

  return results.flatMap((element, index) => {
    const candidate = parseSearchCandidate($, element, index);
    return candidate ? [candidate] : [];
  });
}

function parseSearchCandidate(
  $: ReturnType<typeof load>,
  element: DomElement,
  rawIndex: number,
): SearchCandidateBase | null {
  const link = $(element).find("dt h4 a").first();
  const dictionaryName = cleanText($(element).find("dd.dictionary_name").text());
  const href = link.attr("href");
  const title = cleanText(link.text());

  if (!href || !title || !dictionaryName) {
    return null;
  }

  const normalized = normalizeResultUrl(href);
  if (!normalized.anchorId) {
    throw new KotobankParseError(`搜索结果缺少 anchor：${href}`);
  }

  return {
    title,
    dictionaryName,
    canonicalUrl: normalized.canonicalUrl,
    anchorId: normalized.anchorId,
    pathType: normalized.pathType,
    pathHeadword: normalized.pathHeadword,
    rawIndex,
  };
}
