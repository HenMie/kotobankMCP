import { load } from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

import { KotobankParseError } from "../errors.js";
import { cleanText } from "../text.js";
import type { ParsedWordEntry, ParsedWordPage } from "../types.js";
import { toAbsoluteUrl } from "./url.js";

export function parseWordPage(html: string): ParsedWordPage {
  const $ = load(html);
  const canonicalUrl = $("link[rel='canonical']").attr("href");
  if (!canonicalUrl) {
    throw new KotobankParseError("词条页缺少 canonical 链接");
  }

  const heading = parsePageHeading($);
  const entriesByAnchor = collectEntriesByAnchor($, canonicalUrl);
  const relatedTerms = collectRelatedTerms($);

  return {
    headword: heading.headword,
    reading: heading.reading,
    canonicalUrl,
    entriesByAnchor,
    relatedTerms,
  };
}

function parsePageHeading($: ReturnType<typeof load>): {
  readonly headword: string;
  readonly reading?: string | undefined;
} {
  const heading = $("h1").first();
  if (!heading.length) {
    throw new KotobankParseError("词条页缺少 h1 标题");
  }

  const clonedHeading = heading.clone();
  const readingText = cleanText(clonedHeading.find("span").first().text());
  clonedHeading.find("span").remove();
  const headword = cleanText(clonedHeading.text());

  if (!headword) {
    throw new KotobankParseError("词条页缺少词头");
  }

  return {
    headword,
    reading: readingText.replace(/^（読み）/, "").trim() || undefined,
  };
}

function collectEntriesByAnchor(
  $: ReturnType<typeof load>,
  canonicalUrl: string,
): ReadonlyMap<string, ParsedWordEntry> {
  const entries = new Map<string, ParsedWordEntry>();

  $("div.page_link_marker[id^='w-']").each((_, markerElement) => {
    const marker = $(markerElement);
    const anchorId = marker.attr("id");
    if (!anchorId) {
      return;
    }

    const article = marker.closest("article.dictype").length
      ? marker.closest("article.dictype")
      : marker.nextAll("article.dictype").first();
    if (!article.length) {
      throw new KotobankParseError(`anchor ${anchorId} 后缺少 article.dictype`);
    }

    entries.set(anchorId, parseArticle($, article, anchorId, canonicalUrl));
  });

  return entries;
}

function parseArticle(
  $: CheerioAPI,
  article: Cheerio<AnyNode>,
  anchorId: string,
  canonicalUrl: string,
): ParsedWordEntry {
  const dictionaryName = cleanText(article.find("> h2 > a").first().text());
  const title = cleanText(article.find(".ex > h3").first().text());
  const descriptionText = cleanText(article.find("section.description").first().text());
  const source = article.find("p.source").first();
  const sourceLabel =
    cleanText(source.find("cite").first().text()) ||
    cleanText(source.find("small").first().text()) ||
    dictionaryName;
  const sourceHref = source.find("a").first().attr("href");
  const sourceUrl = sourceHref
    ? toAbsoluteUrl(sourceHref)
    : `${canonicalUrl}#${anchorId}`;
  const sourceText = cleanText(source.text());

  if (!dictionaryName || !title || !descriptionText) {
    throw new KotobankParseError(`anchor ${anchorId} 的 article 结构不完整`);
  }

  return {
    anchorId,
    dictionaryName,
    title,
    descriptionText,
    sourceLabel,
    sourceUrl,
    sourceText,
  };
}

function collectRelatedTerms($: ReturnType<typeof load>): ReadonlyArray<string> {
  return $("#retailkeyword a")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);
}
