import { createServer as createNodeServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { loadServiceConfig, type ServiceConfig } from "./config.js";
import { createHttpApp } from "./http-app.js";
import { createServiceLogger, type ServiceLogger } from "./logging.js";
import { MemoryRateLimiter } from "./rate-limit.js";
import { getOrCreateKotobankRuntime } from "./runtime-service.js";
import type { KotobankService } from "./types.js";

export interface StartHttpServerOptions {
  readonly config?: ServiceConfig | undefined;
  readonly env?: NodeJS.ProcessEnv | undefined;
  readonly host?: string | undefined;
  readonly logger?: ServiceLogger | undefined;
  readonly port?: number | undefined;
  readonly ready?: boolean | undefined;
  readonly service?: KotobankService | undefined;
}

export interface RunningHttpServer {
  readonly host: string;
  readonly port: number;
  readonly server: HttpServer;
  close(): Promise<void>;
}

export async function startHttpServer(options: StartHttpServerOptions = {}): Promise<RunningHttpServer> {
  const env = options.env ?? process.env;
  const config = options.config ?? loadServiceConfig(env);
  const logger = options.logger ?? createServiceLogger(config.logLevel);
  const host = options.host ?? readHostFromEnv(env);
  const configuredPort = options.port ?? config.port;
  const service = options.service ?? getOrCreateKotobankRuntime({ config, env }).service;
  const rateLimiter = new MemoryRateLimiter(config.rateLimit);
  let ready = options.ready ?? false;
  let shuttingDown = false;

  const server = createNodeServer(
    createHttpApp({
      auth: config.auth,
      service,
      isReady: () => ready && !shuttingDown,
      isShuttingDown: () => shuttingDown,
      logger,
      rateLimiter,
    }),
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(configuredPort, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  if (options.ready === undefined) {
    ready = true;
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("HTTP server failed to expose a network address");
  }
  const port = (address as AddressInfo).port;

  logger.info("Kotobank MCP HTTP server listening", {
    host,
    port,
    nodeEnv: config.nodeEnv,
    authMode: config.auth.mode,
    cacheMode: config.cache.mode,
    rateLimitEnabled: config.rateLimit.enabled,
  });

  const close = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    ready = false;
    logger.info("Shutdown signal received", {
      host,
      port,
      gracePeriodMs: config.shutdownGracePeriodMs,
    });
    await closeServer(server, config.shutdownGracePeriodMs);
    logger.info("HTTP server closed", { host, port });
  };

  return {
    host,
    port,
    server,
    close,
  };
}

export async function main(): Promise<void> {
  const running = await startHttpServer();

  const shutdown = async (signal: NodeJS.Signals) => {
    try {
      await running.close();
      process.exit(0);
    } catch (error) {
      console.error(`Failed to shut down HTTP server cleanly after ${signal}`, error);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

async function closeServer(server: HttpServer, timeoutMs: number): Promise<void> {
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Graceful shutdown timed out after ${timeoutMs}ms`));
      }, timeoutMs).unref();
    }),
  ]);
}

function readHostFromEnv(env: NodeJS.ProcessEnv): string {
  return env.KOTOBANK_HOST?.trim() || env.HOST?.trim() || "0.0.0.0";
}
