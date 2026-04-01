import { describe, expect, it } from "vitest";

import { getOrCreateKotobankRuntime, resetKotobankRuntimeForTests } from "../src/runtime-service.js";

describe("getOrCreateKotobankRuntime", () => {
  it("reuses the process-wide runtime singleton", () => {
    resetKotobankRuntimeForTests();

    const env = {
      NODE_ENV: "development",
      KOTOBANK_CACHE_MAX_ENTRIES: "2",
    };
    const first = getOrCreateKotobankRuntime({ env });
    const second = getOrCreateKotobankRuntime({
      env: {
        ...env,
        KOTOBANK_CACHE_MAX_ENTRIES: "99",
      },
    });

    expect(first).toBe(second);
    expect(first.service).toBe(second.service);
    expect(first.cache).toBe(second.cache);
    expect(first.config.cache.maxEntries).toBe(2);

    resetKotobankRuntimeForTests();
  });
});
