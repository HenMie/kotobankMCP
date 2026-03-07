export const BASE_URL = "https://kotobank.jp";
export const DEFAULT_SEARCH_RESULTS = 8;
export const DEFAULT_LOOKUP_ENTRIES = 3;
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const LOOKUP_SEARCH_WINDOW = 20;
export const SUMMARY_LENGTH = 220;
export const AMBIGUITY_SCORE_WINDOW = 40;

export const WORD_PATH = "word";

export const DEFAULT_DICTIONARY_PRIORITY = [
  "デジタル大辞泉",
  "精選版 日本国語大辞典",
  "大辞林 第三版",
  "日本大百科全書(ニッポニカ)",
  "改訂新版　世界大百科事典",
  "ブリタニカ国際大百科事典 小項目事典",
] as const;

export const SCORE_EXACT_HEADWORD = 10_000;
export const SCORE_WORD_PATH = 1_000;
export const SCORE_DICTIONARY_BASE = 100;
export const SCORE_POSITION_BASE = 10;
export const SCORE_PRIMARY_TITLE = 250;
export const SCORE_ANNOTATED_TITLE_PENALTY = -200;
