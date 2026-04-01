import type { ServiceRateLimitConfig } from "./config.js";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly retryAfterMs: number;
  readonly resetAt: number;
}

export class MemoryRateLimiter {
  readonly #entries = new Map<string, RateLimitWindow>();
  readonly #now: () => number;
  readonly #config: ServiceRateLimitConfig;

  constructor(config: ServiceRateLimitConfig, now: () => number = () => Date.now()) {
    this.#config = config;
    this.#now = now;
  }

  consume(key: string): RateLimitDecision {
    const now = this.#now();
    if (!this.#config.enabled) {
      return {
        allowed: true,
        limit: this.#config.maxRequests,
        remaining: this.#config.maxRequests,
        retryAfterMs: 0,
        resetAt: now + this.#config.windowMs,
      };
    }

    const current = this.#entries.get(key);
    if (!current || now >= current.resetAt) {
      const resetAt = now + this.#config.windowMs;
      this.#entries.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit: this.#config.maxRequests,
        remaining: Math.max(this.#config.maxRequests - 1, 0),
        retryAfterMs: 0,
        resetAt,
      };
    }

    if (current.count >= this.#config.maxRequests) {
      return {
        allowed: false,
        limit: this.#config.maxRequests,
        remaining: 0,
        retryAfterMs: Math.max(current.resetAt - now, 0),
        resetAt: current.resetAt,
      };
    }

    current.count += 1;
    return {
      allowed: true,
      limit: this.#config.maxRequests,
      remaining: Math.max(this.#config.maxRequests - current.count, 0),
      retryAfterMs: 0,
      resetAt: current.resetAt,
    };
  }
}
