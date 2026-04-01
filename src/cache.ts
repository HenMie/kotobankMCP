import type { CacheStore } from "./types.js";

interface CacheEntry<Value> {
  readonly value: Value;
  readonly expiresAt: number;
}

interface MemoryCacheOptions {
  readonly maxEntries?: number | undefined;
}

export class MemoryCache<Value> implements CacheStore<Value> {
  readonly #entries = new Map<string, CacheEntry<Value>>();
  readonly #maxEntries: number | undefined;

  constructor(options: MemoryCacheOptions = {}) {
    this.#maxEntries = options.maxEntries;
  }

  get(key: string): Value | undefined {
    const entry = this.#entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: Value, ttlMs: number): void {
    if (this.#entries.has(key)) {
      this.#entries.delete(key);
    }

    this.#entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.evictIfNeeded();
  }

  private evictIfNeeded(): void {
    if (!this.#maxEntries) {
      return;
    }

    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;
      if (!oldestKey) {
        return;
      }
      this.#entries.delete(oldestKey);
    }
  }
}
