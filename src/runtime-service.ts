import { MemoryCache } from "./cache.js";
import { loadServiceConfig, type ServiceConfig } from "./config.js";
import { createHtmlFetcher } from "./http.js";
import { createKotobankService } from "./kotobank/service.js";
import type { CacheStore, HtmlFetcher, KotobankService } from "./types.js";

export interface KotobankRuntime {
  readonly cache: CacheStore<string>;
  readonly config: ServiceConfig;
  readonly htmlFetcher: HtmlFetcher;
  readonly service: KotobankService;
}

interface CreateKotobankRuntimeOptions {
  readonly config?: ServiceConfig | undefined;
  readonly env?: NodeJS.ProcessEnv | undefined;
  readonly fetchImpl?: typeof fetch;
  readonly userAgent?: string;
}

interface CreateDefaultKotobankServiceOptions {
  readonly env?: NodeJS.ProcessEnv | undefined;
  readonly fetchImpl?: typeof fetch;
  readonly userAgent?: string;
}

let sharedRuntime: KotobankRuntime | undefined;

export function createKotobankRuntime(
  options: CreateKotobankRuntimeOptions = {},
): KotobankRuntime {
  const config = options.config ?? loadServiceConfig(options.env);
  const cache = createCacheStore(config);
  const htmlFetcher = createHtmlFetcher({
    cache,
    timeoutMs: config.requestTimeoutMs,
    ttlMs: config.cache.ttlMs,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
  });

  return {
    cache,
    config,
    htmlFetcher,
    service: createKotobankService({ htmlFetcher }),
  };
}

export function getOrCreateKotobankRuntime(
  options: CreateKotobankRuntimeOptions = {},
): KotobankRuntime {
  sharedRuntime ??= createKotobankRuntime(options);
  return sharedRuntime;
}

export function resetKotobankRuntimeForTests(): void {
  sharedRuntime = undefined;
}

function createCacheStore(config: ServiceConfig): CacheStore<string> {
  if (config.cache.mode !== "memory") {
    throw new Error(
      `Unsupported KOTOBANK_CACHE_MODE for this release: ${config.cache.mode}`,
    );
  }

  return new MemoryCache<string>({ maxEntries: config.cache.maxEntries });
}

export function createDefaultKotobankService(
  options: CreateDefaultKotobankServiceOptions = {},
): KotobankService {
  return createKotobankRuntime({
    env: options.env,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
  }).service;
}
