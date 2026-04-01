import { afterEach, describe, expect, it } from "vitest";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { MemoryCache } from "../src/cache.js";
import { createHtmlFetcher } from "../src/http.js";
import { createKotobankService } from "../src/kotobank/service.js";
import { createDefaultKotobankService } from "../src/runtime-service.js";
import type { KotobankService } from "../src/types.js";
import { loadFixture } from "./helpers.js";
import { startTestHttpServer, type RunningTestHttpServer } from "./http-test-server.js";

const runningServers: RunningTestHttpServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()));
});

describe("HTTP MCP integration", () => {
  it("serves /healthz and /readyz", async () => {
    const healthyServer = await startServer({ service: createFixtureService() });
    const health = await fetch(`${healthyServer.baseUrl}/healthz`);
    const ready = await fetch(`${healthyServer.baseUrl}/readyz`);

    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ status: "ok", shuttingDown: false });
    expect(ready.status).toBe(200);
    await expect(ready.json()).resolves.toEqual({ status: "ready" });

    const notReadyServer = await startServer({
      service: createFixtureService(),
      ready: false,
    });
    const notReady = await fetch(`${notReadyServer.baseUrl}/readyz`);

    expect(notReady.status).toBe(503);
    await expect(notReady.json()).resolves.toEqual({ status: "not-ready" });
  });

  it("initializes over HTTP and calls kotobank_search", async () => {
    const server = await startServer({ service: createFixtureService() });
    const { client, close } = await connectClient(server.mcpUrl);

    try {
      const result = await client.callTool({
        name: "kotobank_search",
        arguments: { query: "科学" },
      });

      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        query: "科学",
        totalCandidates: 4,
      });
      const first = (result.structuredContent as { candidates: Array<{ canonicalUrl: string }> }).candidates[0];
      expect(first?.canonicalUrl).toBe("https://kotobank.jp/word/%E7%A7%91%E5%AD%A6-43288");
    } finally {
      await close();
    }
  });

  it("returns disambiguation payload for ambiguous lookup via HTTP", async () => {
    const server = await startServer({ service: createAmbiguousService() });
    const { client, close } = await connectClient(server.mcpUrl);

    try {
      const result = await client.callTool({
        name: "kotobank_lookup",
        arguments: { query: "仮語" },
      });

      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        headword: "仮語",
        needsDisambiguation: true,
      });
      const structured = result.structuredContent as { candidates: Array<unknown> };
      expect(structured.candidates).toHaveLength(2);
    } finally {
      await close();
    }
  });

  it("returns 405 for unsupported transport methods", async () => {
    const server = await startServer({ service: createFixtureService() });

    const getResponse = await fetch(server.mcpUrl, { method: "GET" });
    const deleteResponse = await fetch(server.mcpUrl, { method: "DELETE" });

    expect(getResponse.status).toBe(405);
    await expect(getResponse.json()).resolves.toMatchObject({
      error: { message: "Method not allowed." },
    });
    expect(deleteResponse.status).toBe(405);
    await expect(deleteResponse.json()).resolves.toMatchObject({
      error: { message: "Method not allowed." },
    });
  });

  it("reuses shared cache across repeated HTTP requests", async () => {
    const calls = new Map<string, number>();
    const service = createKotobankService({
      htmlFetcher: createHtmlFetcher({
        cache: new MemoryCache<string>(),
        fetchImpl: async (input) => {
          const url = input.toString();
          calls.set(url, (calls.get(url) ?? 0) + 1);
          const html = scienceFixtures.get(url);
          if (!html) {
            throw new Error(`Unexpected URL: ${url}`);
          }

          return new Response(html, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        },
      }),
    });
    const server = await startServer({ service });
    const { client, close } = await connectClient(server.mcpUrl);

    try {
      await client.callTool({
        name: "kotobank_search",
        arguments: { query: "科学" },
      });
      await client.callTool({
        name: "kotobank_search",
        arguments: { query: "科学" },
      });

      expect(calls.get("https://kotobank.jp/search?q=%E7%A7%91%E5%AD%A6&t=all")).toBe(1);
    } finally {
      await close();
    }
  });

  it("rejects unauthorized requests and accepts bearer-authenticated ones", async () => {
    const server = await startServer({
      service: createFixtureService(),
      authToken: "test-token",
    });

    await expect(connectClient(server.mcpUrl)).rejects.toThrow();

    const authorized = await connectClient(server.mcpUrl, {
      Authorization: "Bearer test-token",
    });

    try {
      const result = await authorized.client.callTool({
        name: "kotobank_search",
        arguments: { query: "科学" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({ query: "科学" });
    } finally {
      await authorized.close();
    }
  });

  it("creates a live runtime service for the deployed HTTP entrypoint", async () => {
    const service = createDefaultKotobankService({
      env: {
        NODE_ENV: "development",
      },
    });

    expect(service).toBeTruthy();
    expect(typeof service.search).toBe("function");
    expect(typeof service.lookup).toBe("function");
  });
});

async function startServer(options: {
  readonly service: KotobankService;
  readonly authToken?: string;
  readonly ready?: boolean;
}): Promise<RunningTestHttpServer> {
  const server = await startTestHttpServer(options);
  runningServers.push(server);
  return server;
}

async function connectClient(
  url: string,
  headers?: Record<string, string>,
): Promise<{
  client: Client;
  close(): Promise<void>;
}> {
  const client = new Client({
    name: "kotobank-http-test-client",
    version: "0.1.0",
  });
  const transport = new StreamableHTTPClientTransport(
    new URL(url),
    headers ? { requestInit: { headers } } : {},
  );

  await client.connect(transport as never);

  return {
    client,
    close: async () => {
      await transport.close();
      await client.close();
    },
  };
}

function createFixtureService(): KotobankService {
  return createKotobankService({
    htmlFetcher: createHtmlFetcher({
      cache: new MemoryCache<string>(),
      fetchImpl: async (input) => {
        const url = input.toString();
        const html = fixtureResponses.get(url);
        if (!html) {
          throw new Error(`Unexpected URL: ${url}`);
        }

        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    }),
  });
}

function createAmbiguousService(): KotobankService {
  return createKotobankService({
    htmlFetcher: createHtmlFetcher({
      cache: new MemoryCache<string>(),
      fetchImpl: async (input) => {
        const url = input.toString();
        const html = ambiguousResponses.get(url);
        if (!html) {
          throw new Error(`Unexpected URL: ${url}`);
        }

        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    }),
  });
}

const fixtureResponses = new Map<string, string>([
  ["https://kotobank.jp/search?q=%E7%A7%91%E5%AD%A6&t=all", loadFixture("search-science.html")],
  ["https://kotobank.jp/search?q=%E9%A3%9F%E3%81%B9%E3%82%8B&t=all", loadFixture("search-taberu.html")],
  ["https://kotobank.jp/word/%E9%A3%9F%E3%81%B9%E3%82%8B-562605", loadFixture("word-taberu.html")],
]);

const scienceFixtures = new Map<string, string>([
  ["https://kotobank.jp/search?q=%E7%A7%91%E5%AD%A6&t=all", loadFixture("search-science.html")],
]);

const ambiguousResponses = new Map<string, string>([
  [
    "https://kotobank.jp/search?q=%E4%BB%AE%E8%AA%9E&t=all",
    `<!doctype html><html><body><section class="searchSerp">
      <dl>
        <dt><h4><a href="/word/%E4%BB%AE%E8%AA%9E-1#w-a">仮語【かりご】</a></h4></dt>
        <dd class="dictionary_name">辞典A</dd>
      </dl>
      <dl>
        <dt><h4><a href="/word/%E4%BB%AE%E8%AA%9E-2#w-b">仮語【かりご】</a></h4></dt>
        <dd class="dictionary_name">辞典B</dd>
      </dl>
    </section></body></html>`,
  ],
]);
