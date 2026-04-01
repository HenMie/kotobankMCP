import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { authorizeBearerToken } from "./auth.js";
import type { ServiceAuthConfig } from "./config.js";
import type { ServiceLogger } from "./logging.js";
import type { MemoryRateLimiter } from "./rate-limit.js";
import { createServer as createMcpServer } from "./server.js";
import type { KotobankService } from "./types.js";

export interface CreateHttpAppOptions {
  readonly auth: ServiceAuthConfig;
  readonly service: KotobankService;
  readonly isReady?: (() => boolean) | undefined;
  readonly isShuttingDown?: (() => boolean) | undefined;
  readonly logger: ServiceLogger;
  readonly rateLimiter?: MemoryRateLimiter | undefined;
}

const JSON_RPC_METHOD_NOT_ALLOWED = {
  jsonrpc: "2.0",
  error: {
    code: -32000,
    message: "Method not allowed.",
  },
  id: null,
} as const;

export function createHttpApp(options: CreateHttpAppOptions): RequestListener {
  return async (req, res) => {
    const startedAt = Date.now();
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    let requestSummary: Record<string, unknown> | undefined;

    try {
      if (url.pathname === "/healthz") {
        writeJson(res, 200, {
          status: "ok",
          shuttingDown: options.isShuttingDown?.() ?? false,
        });
        logRequest(options.logger, method, url.pathname, res.statusCode, startedAt);
        return;
      }

      if (url.pathname === "/readyz") {
        const ready = options.isReady?.() ?? true;
        writeJson(res, ready ? 200 : 503, {
          status: ready ? "ready" : "not-ready",
        });
        logRequest(options.logger, method, url.pathname, res.statusCode, startedAt);
        return;
      }

      if (url.pathname !== "/mcp") {
        writeJson(res, 404, { error: "Not found" });
        logRequest(options.logger, method, url.pathname, res.statusCode, startedAt);
        return;
      }

      if (method !== "POST") {
        writeJson(res, 405, JSON_RPC_METHOD_NOT_ALLOWED);
        logRequest(options.logger, method, url.pathname, res.statusCode, startedAt);
        return;
      }

      if (!(options.isReady?.() ?? true) || options.isShuttingDown?.()) {
        writeJsonRpcError(res, 503, "Server is not ready.");
        logRequest(options.logger, method, url.pathname, res.statusCode, startedAt);
        return;
      }

      const authResult = authorizeBearerToken(req.headers.authorization, options.auth);
      if (!authResult.ok) {
        writeJson(res, authResult.statusCode, authResult.error);
        logRequest(options.logger, method, url.pathname, res.statusCode, startedAt, {
          authMode: options.auth.mode,
          errorCode: authResult.error.code,
        });
        return;
      }

      const rateLimitDecision = options.rateLimiter?.consume(getClientKey(req));
      if (rateLimitDecision) {
        setRateLimitHeaders(res, rateLimitDecision.limit, rateLimitDecision.remaining);
        if (!rateLimitDecision.allowed) {
          res.setHeader("retry-after", Math.ceil(rateLimitDecision.retryAfterMs / 1000));
          writeJson(res, 429, {
            error: "RATE_LIMITED",
            message: "Rate limit exceeded.",
            retryAfterMs: rateLimitDecision.retryAfterMs,
          });
          logRequest(options.logger, method, url.pathname, res.statusCode, startedAt, {
            errorCode: "RATE_LIMITED",
            retryAfterMs: rateLimitDecision.retryAfterMs,
          });
          return;
        }
      }

      const parsedBody = await readJsonBody(req);
      requestSummary = summarizeJsonRpcRequest(parsedBody);
      const transport = new StreamableHTTPServerTransport();
      const server = createMcpServer({ service: options.service });
      let cleanedUp = false;

      const cleanup = async () => {
        if (cleanedUp) {
          return;
        }

        cleanedUp = true;
        res.off("close", onClose);
        await transport.close();
        await server.close();
      };

      const onClose = () => {
        void cleanup();
      };

      res.on("close", onClose);

      try {
        await server.connect(transport as never);
        await transport.handleRequest(req, res, parsedBody);
      } finally {
        await cleanup();
      }

      logRequest(options.logger, method, url.pathname, res.statusCode || 200, startedAt, requestSummary);
    } catch (error) {
      options.logger.error("HTTP request failed", {
        method,
        path: url.pathname,
        ...(requestSummary ?? {}),
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        if (error instanceof InvalidJsonBodyError) {
          writeJson(res, 400, {
            error: "INVALID_JSON",
            message: error.message,
          });
        } else {
          writeJsonRpcError(res, 500, "Internal server error");
        }
      }

      logRequest(options.logger, method, url.pathname, res.statusCode || 500, startedAt, requestSummary);
    }
  };
}

class InvalidJsonBodyError extends Error {}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    throw new InvalidJsonBodyError("Request body must be valid JSON.");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw new InvalidJsonBodyError(
      error instanceof Error ? `Request body must be valid JSON: ${error.message}` : "Request body must be valid JSON.",
    );
  }
}

function summarizeJsonRpcRequest(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const message = payload as {
    method?: unknown;
    params?: {
      name?: unknown;
      arguments?: {
        query?: unknown;
      };
    };
  };
  const summary: Record<string, unknown> = {};

  if (typeof message.method === "string") {
    summary.mcpMethod = message.method;
  }
  if (typeof message.params?.name === "string") {
    summary.toolName = message.params.name;
  }
  if (typeof message.params?.arguments?.query === "string") {
    summary.query = message.params.arguments.query;
  }

  return Object.keys(summary).length ? summary : undefined;
}

function getClientKey(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? forwarded;
  }

  return req.socket.remoteAddress ?? "unknown";
}

function setRateLimitHeaders(res: ServerResponse, limit: number, remaining: number): void {
  res.setHeader("x-ratelimit-limit", String(limit));
  res.setHeader("x-ratelimit-remaining", String(remaining));
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function writeJsonRpcError(res: ServerResponse, statusCode: number, message: string): void {
  writeJson(res, statusCode, {
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message,
    },
    id: null,
  });
}

function logRequest(
  logger: ServiceLogger,
  method: string,
  path: string,
  statusCode: number,
  startedAt: number,
  metadata?: Record<string, unknown>,
): void {
  logger.info("HTTP request completed", {
    method,
    path,
    statusCode,
    durationMs: Date.now() - startedAt,
    ...(metadata ?? {}),
  });
}
