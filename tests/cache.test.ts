import { describe, expect, it } from "vitest";

import { MemoryCache } from "../src/cache.js";

describe("MemoryCache", () => {
  it("evicts the oldest entry when maxEntries is exceeded", () => {
    const cache = new MemoryCache<string>({ maxEntries: 2 });

    cache.set("a", "A", 10_000);
    cache.set("b", "B", 10_000);
    cache.set("c", "C", 10_000);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("B");
    expect(cache.get("c")).toBe("C");
  });
});
