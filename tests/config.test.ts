import { describe, expect, it } from "vitest";

import { loadServiceConfig } from "../src/config.js";

describe("loadServiceConfig", () => {
  it("uses documented development defaults", () => {
    const config = loadServiceConfig({ NODE_ENV: "development" });

    expect(config).toMatchObject({
      port: 8080,
      logLevel: "info",
      requestTimeoutMs: 15_000,
      shutdownGracePeriodMs: 10_000,
      auth: {
        mode: "disabled",
      },
      cache: {
        mode: "memory",
        ttlMs: 300_000,
        maxEntries: 512,
      },
      rateLimit: {
        enabled: true,
        windowMs: 60_000,
        maxRequests: 60,
      },
    });
  });

  it("requires an auth token in production mode by default", () => {
    expect(() => loadServiceConfig({ NODE_ENV: "production" })).toThrow(
      "KOTOBANK_AUTH_TOKEN is required when KOTOBANK_AUTH_MODE=required",
    );
  });

  it("throws on invalid numeric env values", () => {
    expect(() => loadServiceConfig({ KOTOBANK_PORT: "0" })).toThrow(
      "KOTOBANK_PORT must be a positive integer",
    );
  });

  it("accepts explicit auth and cache overrides", () => {
    const config = loadServiceConfig({
      NODE_ENV: "production",
      KOTOBANK_AUTH_MODE: "required",
      KOTOBANK_AUTH_TOKEN: "secret-token",
      KOTOBANK_CACHE_MODE: "sqlite",
      KOTOBANK_CACHE_TTL_MS: "60000",
      KOTOBANK_CACHE_MAX_ENTRIES: "42",
      KOTOBANK_RATE_LIMIT_MAX_REQUESTS: "12",
      KOTOBANK_RATE_LIMIT_WINDOW_MS: "30000",
    });

    expect(config.auth).toEqual({
      mode: "required",
      bearerToken: "secret-token",
    });
    expect(config.cache).toEqual({
      mode: "sqlite",
      ttlMs: 60_000,
      maxEntries: 42,
    });
    expect(config.rateLimit).toEqual({
      enabled: true,
      windowMs: 30_000,
      maxRequests: 12,
    });
  });
});
