import { BASE_URL } from "../constants.js";

export function buildSearchUrl(query: string): string {
  const url = new URL("/search", BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("t", "all");
  return url.toString();
}

export function normalizeResultUrl(href: string): {
  readonly canonicalUrl: string;
  readonly anchorId: string;
  readonly pathType: string;
  readonly pathHeadword: string;
} {
  const url = new URL(href, BASE_URL);
  const anchorId = url.hash.replace(/^#/, "");
  const canonicalUrl = new URL(url.pathname, BASE_URL).toString();
  const pathType = getPathType(url.pathname);
  const pathHeadword = getPathHeadword(url.pathname);

  return {
    canonicalUrl,
    anchorId,
    pathType,
    pathHeadword,
  };
}

export function toAbsoluteUrl(href: string): string {
  return new URL(href, BASE_URL).toString();
}

function getPathType(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] ?? "";
}

function getPathHeadword(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments.at(-1) ?? "";
  return decodeURIComponent(slug).replace(/-\d+$/, "");
}
