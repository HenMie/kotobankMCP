import { describe, expect, it } from "vitest";

import { MemoryRateLimiter } from "../src/rate-limit.js";

describe("MemoryRateLimiter", () => {
  it("allows requests until the window is exhausted", () => {
    let now = 1_000;
    const limiter = new MemoryRateLimiter(
      { enabled: true, windowMs: 10_000, maxRequests: 2 },
      () => now,
    );

    expect(limiter.consume("client-1")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.consume("client-1")).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.consume("client-1")).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterMs: 10_000,
    });

    now = 11_000;
    expect(limiter.consume("client-1")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("short-circuits when disabled", () => {
    const limiter = new MemoryRateLimiter({ enabled: false, windowMs: 10_000, maxRequests: 5 });

    expect(limiter.consume("client-1")).toMatchObject({
      allowed: true,
      remaining: 5,
      retryAfterMs: 0,
    });
  });
});
