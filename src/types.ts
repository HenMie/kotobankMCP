export type DictionaryScope = "jp-monolingual" | "all";

export interface SearchParams {
  readonly query: string;
  readonly dictionaryScope?: DictionaryScope | undefined;
  readonly maxResults?: number | undefined;
}

export interface LookupParams {
  readonly query: string;
  readonly canonicalUrl?: string | undefined;
  readonly anchorId?: string | undefined;
  readonly preferredDictionaries?: ReadonlyArray<string> | undefined;
  readonly maxEntries?: number | undefined;
  readonly includeExcerpt?: boolean | undefined;
}

export interface SearchCandidateBase {
  readonly title: string;
  readonly dictionaryName: string;
  readonly canonicalUrl: string;
  readonly anchorId: string;
  readonly pathType: string;
  readonly pathHeadword: string;
  readonly rawIndex: number;
}

export interface SearchCandidate {
  readonly title: string;
  readonly dictionaryName: string;
  readonly canonicalUrl: string;
  readonly anchorId: string;
  readonly pathType: string;
  readonly score: number;
}

export interface RankedSearchCandidate extends SearchCandidateBase, SearchCandidate {
  readonly score: number;
}

export interface SearchResult extends Record<string, unknown> {
  readonly query: string;
  readonly totalCandidates: number;
  readonly candidates: ReadonlyArray<SearchCandidate>;
}

export interface LookupEntry {
  readonly dictionaryName: string;
  readonly title: string;
  readonly summaryText: string;
  readonly sourceLabel: string;
  readonly sourceUrl: string;
  readonly anchorId: string;
}

export interface LookupResult extends Record<string, unknown> {
  readonly headword: string;
  readonly reading?: string | undefined;
  readonly canonicalUrl: string;
  readonly entries: ReadonlyArray<LookupEntry>;
  readonly relatedTerms: ReadonlyArray<string>;
  readonly needsDisambiguation: boolean;
  readonly candidates?: ReadonlyArray<SearchCandidate> | undefined;
}

export interface ParsedWordEntry {
  readonly anchorId: string;
  readonly dictionaryName: string;
  readonly title: string;
  readonly descriptionText: string;
  readonly sourceLabel: string;
  readonly sourceUrl: string;
  readonly sourceText: string;
}

export interface ParsedWordPage {
  readonly headword: string;
  readonly reading?: string | undefined;
  readonly canonicalUrl: string;
  readonly entriesByAnchor: ReadonlyMap<string, ParsedWordEntry>;
  readonly relatedTerms: ReadonlyArray<string>;
}

export interface HtmlFetcher {
  fetch(url: string): Promise<string>;
}

export interface CacheStore<Value> {
  get(key: string): Value | undefined;
  set(key: string, value: Value, ttlMs: number): void;
}

export interface KotobankService {
  search(params: SearchParams): Promise<SearchResult>;
  lookup(params: LookupParams): Promise<LookupResult>;
}
