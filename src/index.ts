#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createDefaultKotobankService } from "./runtime-service.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const service = createDefaultKotobankService();
  const server = createServer({ service });
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("Kotobank MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
