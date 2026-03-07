import { MemoryCache } from "./cache.js";
import { createHtmlFetcher } from "./http.js";
import { createKotobankService } from "./kotobank/service.js";
import type { KotobankService } from "./types.js";

interface CreateDefaultKotobankServiceOptions {
  readonly fetchImpl?: typeof fetch;
  readonly userAgent?: string;
}

export function createDefaultKotobankService(
  options: CreateDefaultKotobankServiceOptions = {},
): KotobankService {
  const cache = new MemoryCache<string>();
  const htmlFetcher = createHtmlFetcher({
    cache,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
  });

  return createKotobankService({ htmlFetcher });
}
