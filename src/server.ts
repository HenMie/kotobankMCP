import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { KotobankError } from "./errors.js";
import { lookupInputSchema, lookupOutputSchema, searchInputSchema, searchOutputSchema } from "./mcp-schemas.js";
import type { KotobankService, LookupResult, SearchResult } from "./types.js";

interface CreateServerOptions {
  readonly service: KotobankService;
}

export function createServer(options: CreateServerOptions): McpServer {
  const server = new McpServer({
    name: "kotobank-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "kotobank_search",
    {
      title: "Kotobank Search",
      description: "Search Kotobank candidates and rank likely Japanese dictionary matches.",
      inputSchema: searchInputSchema,
      outputSchema: searchOutputSchema,
    },
    async (input) => {
      try {
        return buildSearchResult(await options.service.search(input));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  server.registerTool(
    "kotobank_lookup",
    {
      title: "Kotobank Lookup",
      description: "Resolve a Kotobank query into structured dictionary entries.",
      inputSchema: lookupInputSchema,
      outputSchema: lookupOutputSchema,
    },
    async (input) => {
      try {
        return buildLookupResult(await options.service.lookup(input));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  return server;
}

function buildSearchResult(payload: SearchResult) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ tool: "kotobank_search", data: payload }, null, 2),
      },
    ],
    structuredContent: payload as Record<string, unknown>,
  };
}

function buildLookupResult(payload: LookupResult) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ tool: "kotobank_lookup", data: payload }, null, 2),
      },
    ],
    structuredContent: payload as Record<string, unknown>,
  };
}

function buildErrorResult(error: unknown) {
  const normalizedError = normalizeError(error);
  return {
    content: [
      {
        type: "text" as const,
        text: `${normalizedError.code}: ${normalizedError.message}`,
      },
    ],
    structuredContent: { error: normalizedError },
    isError: true,
  };
}

function normalizeError(error: unknown): { readonly code: string; readonly message: string } {
  if (error instanceof KotobankError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: "UNEXPECTED_ERROR", message: error.message };
  }

  return { code: "UNEXPECTED_ERROR", message: "发生未知错误" };
}
