import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { HtmlFetcher } from "../src/types.js";

export function loadFixture(name: string): string {
  const path = resolve(process.cwd(), "tests", "fixtures", name);
  return readFileSync(path, "utf8");
}

export function createStaticFetcher(fixtures: Record<string, string>): HtmlFetcher {
  return {
    fetch: async (url: string) => {
      const html = fixtures[url];
      if (!html) {
        throw new Error(`Unexpected URL: ${url}`);
      }

      return html;
    },
  };
}
