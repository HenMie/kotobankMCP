import {
  AMBIGUITY_SCORE_WINDOW,
  DEFAULT_DICTIONARY_PRIORITY,
  DEFAULT_LOOKUP_ENTRIES,
  DEFAULT_SEARCH_RESULTS,
  LOOKUP_SEARCH_WINDOW,
  SCORE_EXACT_HEADWORD,
  WORD_PATH,
} from "../constants.js";
import { KotobankNotFoundError, KotobankParseError } from "../errors.js";
import { toSummaryText } from "../text.js";
import type {
  HtmlFetcher,
  KotobankService,
  LookupEntry,
  LookupParams,
  LookupResult,
  ParsedWordEntry,
  RankedSearchCandidate,
  SearchCandidate,
  SearchParams,
  SearchResult,
} from "../types.js";
import { rankCandidates } from "./ranking.js";
import { parseSearchCandidates } from "./search-parser.js";
import { buildSearchUrl } from "./url.js";
import { parseWordPage } from "./word-parser.js";

interface CreateKotobankServiceOptions {
  readonly htmlFetcher: HtmlFetcher;
  readonly preferredDictionaries?: ReadonlyArray<string>;
}

interface CandidateGroup {
  readonly canonicalUrl: string;
  readonly candidates: ReadonlyArray<RankedSearchCandidate>;
  readonly topScore: number;
  readonly exactHeadwordMatch: boolean;
}

export function createKotobankService(
  options: CreateKotobankServiceOptions,
): KotobankService {
  const defaultPreferred = options.preferredDictionaries ?? DEFAULT_DICTIONARY_PRIORITY;

  return {
    search: async (params: SearchParams): Promise<SearchResult> => {
      const ranked = await fetchRankedCandidates(
        options.htmlFetcher,
        params.query,
        defaultPreferred,
      );
      const scoped = applyDictionaryScope(ranked, params.dictionaryScope ?? "jp-monolingual");
      const maxResults = params.maxResults ?? DEFAULT_SEARCH_RESULTS;

      return {
        query: params.query,
        totalCandidates: scoped.length,
        candidates: scoped.slice(0, maxResults).map(toPublicCandidate),
      };
    },
    lookup: async (params: LookupParams): Promise<LookupResult> => {
      return lookupWord(options.htmlFetcher, params, defaultPreferred);
    },
  };
}

async function lookupWord(
  htmlFetcher: HtmlFetcher,
  params: LookupParams,
  defaultPreferredDictionaries: ReadonlyArray<string>,
): Promise<LookupResult> {
  const preferredDictionaries =
    params.preferredDictionaries ?? defaultPreferredDictionaries;
  const ranked = await fetchLookupCandidates(
    htmlFetcher,
    params.query,
    preferredDictionaries,
  );
  if (!ranked.length) {
    throw new KotobankNotFoundError(`Kotobank 未找到词条：${params.query}`);
  }

  const groups = groupCandidatesByCanonicalUrl(ranked);
  const selectedGroup = resolveSelectedGroup(groups, params);
  if ((params.canonicalUrl || params.anchorId) && !selectedGroup) {
    throw new KotobankNotFoundError(`Kotobank 未找到已选候选：${params.query}`);
  }
  if (!selectedGroup && isAmbiguous(groups)) {
    return {
      headword: params.query,
      canonicalUrl: groups[0]?.canonicalUrl ?? "",
      entries: [],
      relatedTerms: [],
      needsDisambiguation: true,
      candidates: ranked.map(toPublicCandidate),
    };
  }

  const resolvedGroup = selectedGroup ?? groups[0];
  if (!resolvedGroup) {
    throw new KotobankNotFoundError(`Kotobank 未找到可解析词条：${params.query}`);
  }

  const html = await htmlFetcher.fetch(resolvedGroup.canonicalUrl);
  const parsedPage = parseWordPage(html);
  return {
    headword: parsedPage.headword,
    reading: parsedPage.reading,
    canonicalUrl: parsedPage.canonicalUrl,
    entries: mapLookupEntries(
      parsedPage.entriesByAnchor,
      resolvedGroup.candidates,
      params.maxEntries ?? DEFAULT_LOOKUP_ENTRIES,
      params.includeExcerpt ?? false,
      preferredDictionaries,
      params.anchorId,
    ),
    relatedTerms: parsedPage.relatedTerms,
    needsDisambiguation: false,
  };
}

async function fetchRankedCandidates(
  htmlFetcher: HtmlFetcher,
  query: string,
  preferredDictionaries: ReadonlyArray<string>,
): Promise<ReadonlyArray<RankedSearchCandidate>> {
  const html = await htmlFetcher.fetch(buildSearchUrl(query));
  const parsed = parseSearchCandidates(html);
  return rankCandidates(query, parsed, preferredDictionaries);
}

async function fetchLookupCandidates(
  htmlFetcher: HtmlFetcher,
  query: string,
  preferredDictionaries: ReadonlyArray<string>,
): Promise<ReadonlyArray<RankedSearchCandidate>> {
  const ranked = await fetchRankedCandidates(htmlFetcher, query, preferredDictionaries);
  return ranked.slice(0, LOOKUP_SEARCH_WINDOW);
}

function applyDictionaryScope(
  candidates: ReadonlyArray<RankedSearchCandidate>,
  scope: SearchParams["dictionaryScope"],
): ReadonlyArray<RankedSearchCandidate> {
  if (scope === "all") {
    return candidates;
  }

  const wordCandidates = candidates.filter((candidate) => candidate.pathType === WORD_PATH);
  return wordCandidates.length ? wordCandidates : candidates;
}

function groupCandidatesByCanonicalUrl(
  candidates: ReadonlyArray<RankedSearchCandidate>,
): ReadonlyArray<CandidateGroup> {
  const groups = new Map<string, ReadonlyArray<RankedSearchCandidate>>();
  for (const candidate of candidates) {
    const existing = groups.get(candidate.canonicalUrl) ?? [];
    groups.set(candidate.canonicalUrl, [...existing, candidate]);
  }

  return [...groups.entries()]
    .map(([canonicalUrl, groupedCandidates]) => ({
      canonicalUrl,
      candidates: groupedCandidates,
      topScore: groupedCandidates[0]?.score ?? 0,
      exactHeadwordMatch: (groupedCandidates[0]?.score ?? 0) >= SCORE_EXACT_HEADWORD,
    }))
    .sort(compareCandidateGroups);
}

function compareCandidateGroups(left: CandidateGroup, right: CandidateGroup): number {
  if (left.topScore !== right.topScore) {
    return right.topScore - left.topScore;
  }

  const leftFirst = left.candidates[0];
  const rightFirst = right.candidates[0];
  if (!leftFirst || !rightFirst) {
    return 0;
  }

  return leftFirst.rawIndex - rightFirst.rawIndex;
}

function isAmbiguous(groups: ReadonlyArray<CandidateGroup>): boolean {
  const [first, second] = groups;
  if (!first || !second) {
    return false;
  }
  if (first.exactHeadwordMatch && !second.exactHeadwordMatch) {
    return false;
  }

  return Math.abs(first.topScore - second.topScore) <= AMBIGUITY_SCORE_WINDOW;
}

function resolveSelectedGroup(
  groups: ReadonlyArray<CandidateGroup>,
  params: LookupParams,
): CandidateGroup | undefined {
  if (!params.canonicalUrl && !params.anchorId) {
    return undefined;
  }

  return groups.find((group) => {
    if (params.canonicalUrl && group.canonicalUrl !== params.canonicalUrl) {
      return false;
    }
    return !params.anchorId ||
      group.candidates.some((candidate) => candidate.anchorId === params.anchorId);
  });
}

function mapLookupEntries(
  entriesByAnchor: ReadonlyMap<string, ParsedWordEntry>,
  candidates: ReadonlyArray<RankedSearchCandidate>,
  maxEntries: number,
  includeExcerpt: boolean,
  preferredDictionaries: ReadonlyArray<string>,
  selectedAnchorId?: string,
): ReadonlyArray<LookupEntry> {
  const selectedCandidates = prioritizeLookupCandidates(
    candidates,
    preferredDictionaries,
    selectedAnchorId,
  )
    .filter(uniqueAnchor)
    .slice(0, maxEntries);

  return selectedCandidates.map((candidate) => {
    const entry = entriesByAnchor.get(candidate.anchorId);
    if (!entry) {
      throw new KotobankParseError(`词条页缺少 anchor：${candidate.anchorId}`);
    }

    return {
      dictionaryName: entry.dictionaryName,
      title: entry.title,
      summaryText: includeExcerpt ? entry.descriptionText : toSummaryText(entry.descriptionText),
      sourceLabel: entry.sourceLabel,
      sourceUrl: entry.sourceUrl,
      anchorId: entry.anchorId,
    };
  });
}

function prioritizeLookupCandidates(
  candidates: ReadonlyArray<RankedSearchCandidate>,
  preferredDictionaries: ReadonlyArray<string>,
  selectedAnchorId?: string,
): ReadonlyArray<RankedSearchCandidate> {
  return [...candidates].sort((left, right) => {
    const leftSelected = Boolean(selectedAnchorId) && left.anchorId === selectedAnchorId;
    const rightSelected = Boolean(selectedAnchorId) && right.anchorId === selectedAnchorId;
    if (leftSelected !== rightSelected) {
      return leftSelected ? -1 : 1;
    }

    const leftIndex = getPreferenceIndex(left.dictionaryName, preferredDictionaries);
    const rightIndex = getPreferenceIndex(right.dictionaryName, preferredDictionaries);
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    return left.rawIndex - right.rawIndex;
  });
}

function getPreferenceIndex(
  dictionaryName: string,
  preferredDictionaries: ReadonlyArray<string>,
): number {
  const index = preferredDictionaries.indexOf(dictionaryName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function uniqueAnchor(
  candidate: RankedSearchCandidate,
  index: number,
  candidates: ReadonlyArray<RankedSearchCandidate>,
): boolean {
  return candidates.findIndex((item) => item.anchorId === candidate.anchorId) === index;
}

function toPublicCandidate(candidate: RankedSearchCandidate): SearchCandidate {
  return {
    title: candidate.title,
    dictionaryName: candidate.dictionaryName,
    canonicalUrl: candidate.canonicalUrl,
    anchorId: candidate.anchorId,
    pathType: candidate.pathType,
    score: candidate.score,
  };
}
