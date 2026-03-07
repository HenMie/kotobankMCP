import type { CacheStore } from "./types.js";

interface CacheEntry<Value> {
  readonly value: Value;
  readonly expiresAt: number;
}

export class MemoryCache<Value> implements CacheStore<Value> {
  readonly #entries = new Map<string, CacheEntry<Value>>();

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
    this.#entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }
}
