import { SUMMARY_LENGTH } from "./constants.js";

const NORMALIZATION_PATTERN = /[\s‐‑‒–—―ー・･【】\[\]（）()「」『』〈〉《》]/g;

export function normalizeMatchText(value: string): string {
  return value.normalize("NFKC").replace(NORMALIZATION_PATTERN, "").trim();
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function toSummaryText(value: string): string {
  const cleaned = cleanText(value);
  if (cleaned.length <= SUMMARY_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, SUMMARY_LENGTH).trimEnd()}…`;
}
