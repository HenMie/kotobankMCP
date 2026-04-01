import type { KotobankService } from "../src/types.js";
import { startHttpServer } from "../src/http-main.js";

interface TestHttpServerOptions {
  readonly authToken?: string;
  readonly host?: string;
  readonly port?: number;
  readonly ready?: boolean;
  readonly service: KotobankService;
}

export interface RunningTestHttpServer {
  readonly baseUrl: string;
  readonly mcpUrl: string;
  close(): Promise<void>;
}

export async function startTestHttpServer(
  options: TestHttpServerOptions,
): Promise<RunningTestHttpServer> {
  const host = options.host ?? "127.0.0.1";
  const running = await startHttpServer({
    env: {
      NODE_ENV: "development",
      KOTOBANK_AUTH_MODE: options.authToken ? "required" : "disabled",
      ...(options.authToken ? { KOTOBANK_AUTH_TOKEN: options.authToken } : {}),
    },
    host,
    port: options.port ?? 0,
    ready: options.ready,
    service: options.service,
  });

  const baseUrl = `http://${host}:${running.port}`;
  return {
    baseUrl,
    mcpUrl: `${baseUrl}/mcp`,
    close: () => running.close(),
  };
}
