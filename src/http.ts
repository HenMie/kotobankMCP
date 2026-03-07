import {
  BASE_URL,
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from "./constants.js";
import { KotobankNetworkError } from "./errors.js";
import type { CacheStore, HtmlFetcher } from "./types.js";

interface CreateHtmlFetcherOptions {
  readonly cache: CacheStore<string>;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly ttlMs?: number;
  readonly userAgent?: string;
}

export function createHtmlFetcher(options: CreateHtmlFetcherOptions): HtmlFetcher {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const userAgent = options.userAgent ?? `${BASE_URL} personal-mcp/0.1.0`;
  const inFlight = new Map<string, Promise<string>>();

  return {
    fetch: async (url: string) => {
      const cached = options.cache.get(url);
      if (cached) {
        return cached;
      }

      const existing = inFlight.get(url);
      if (existing) {
        return existing;
      }

      const request = fetchHtml(url, fetchImpl, timeoutMs, userAgent)
        .then((html) => {
          options.cache.set(url, html, ttlMs);
          return html;
        })
        .finally(() => {
          inFlight.delete(url);
        });

      inFlight.set(url, request);
      return request;
    },
  };
}

async function fetchHtml(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  userAgent: string,
): Promise<string> {
  const response = await requestHtml(url, fetchImpl, timeoutMs, userAgent);
  return response.text();
}

async function requestHtml(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  userAgent: string,
): Promise<Response> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        "user-agent": userAgent,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new KotobankNetworkError(
        `Kotobank 请求失败：${response.status} ${response.statusText} (${url})`,
      );
    }

    return response;
  } catch (error) {
    if (error instanceof KotobankNetworkError) {
      throw error;
    }

    throw new KotobankNetworkError(`Kotobank 请求异常：${url}`, error);
  }
}
