import {
  DEFAULT_DICTIONARY_PRIORITY,
  SCORE_DICTIONARY_BASE,
  SCORE_EXACT_HEADWORD,
  SCORE_POSITION_BASE,
  SCORE_PRIMARY_TITLE,
  SCORE_ANNOTATED_TITLE_PENALTY,
  SCORE_WORD_PATH,
  WORD_PATH,
} from "../constants.js";
import type { RankedSearchCandidate, SearchCandidateBase } from "../types.js";
import { normalizeMatchText } from "../text.js";

export function rankCandidates(
  query: string,
  candidates: ReadonlyArray<SearchCandidateBase>,
  preferredDictionaries: ReadonlyArray<string> = DEFAULT_DICTIONARY_PRIORITY,
): ReadonlyArray<RankedSearchCandidate> {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(query, candidate, preferredDictionaries),
    }))
    .sort(compareRankedCandidates);
}

function scoreCandidate(
  query: string,
  candidate: SearchCandidateBase,
  preferredDictionaries: ReadonlyArray<string>,
): number {
  const normalizedQuery = normalizeMatchText(query);
  const normalizedHeadword = normalizeMatchText(candidate.pathHeadword);
  const exactHeadwordScore =
    normalizedQuery && normalizedQuery === normalizedHeadword
      ? SCORE_EXACT_HEADWORD
      : 0;
  const wordPathScore = candidate.pathType === WORD_PATH ? SCORE_WORD_PATH : 0;
  const titleScore = getTitleScore(query, candidate.title);
  const dictionaryScore = getDictionaryScore(candidate.dictionaryName, preferredDictionaries);
  const positionScore = Math.max(0, SCORE_POSITION_BASE - candidate.rawIndex);

  return (
    exactHeadwordScore +
    wordPathScore +
    titleScore +
    dictionaryScore +
    positionScore
  );
}

function getDictionaryScore(
  dictionaryName: string,
  preferredDictionaries: ReadonlyArray<string>,
): number {
  const index = preferredDictionaries.indexOf(dictionaryName);
  if (index === -1) {
    return 0;
  }

  return (preferredDictionaries.length - index) * SCORE_DICTIONARY_BASE;
}

function getTitleScore(query: string, title: string): number {
  const hasPrimaryHeadword =
    title.includes(`【${query}】`) ||
    title.includes(`（${query}）`) ||
    title.includes(`(${query})`);
  const hasAnnotation = /［.+］/.test(title);

  if (!hasPrimaryHeadword && !hasAnnotation) {
    return 0;
  }

  return (hasPrimaryHeadword ? SCORE_PRIMARY_TITLE : 0) +
    (hasAnnotation ? SCORE_ANNOTATED_TITLE_PENALTY : 0);
}

function compareRankedCandidates(
  left: RankedSearchCandidate,
  right: RankedSearchCandidate,
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return left.rawIndex - right.rawIndex;
}
