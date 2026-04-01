export type ServiceLogLevel = "debug" | "info" | "warn" | "error";
export type ServiceAuthMode = "disabled" | "required";
export type ServiceCacheMode = "memory" | "redis" | "sqlite";

export interface ServiceAuthConfig {
  readonly mode: ServiceAuthMode;
  readonly bearerToken?: string | undefined;
}

export interface ServiceCacheConfig {
  readonly mode: ServiceCacheMode;
  readonly ttlMs: number;
  readonly maxEntries: number;
}

export interface ServiceRateLimitConfig {
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface ServiceConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly logLevel: ServiceLogLevel;
  readonly requestTimeoutMs: number;
  readonly shutdownGracePeriodMs: number;
  readonly auth: ServiceAuthConfig;
  readonly cache: ServiceCacheConfig;
  readonly rateLimit: ServiceRateLimitConfig;
}

const LOG_LEVELS = new Set<ServiceLogLevel>(["debug", "info", "warn", "error"]);
const AUTH_MODES = new Set<ServiceAuthMode>(["disabled", "required"]);
const CACHE_MODES = new Set<ServiceCacheMode>(["memory", "redis", "sqlite"]);

const DEFAULT_PORT = 8080;
const DEFAULT_LOG_LEVEL: ServiceLogLevel = "info";
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_SHUTDOWN_GRACE_PERIOD_MS = 10_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CACHE_MAX_ENTRIES = 512;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;

export function loadServiceConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  const nodeEnv = readString(env.NODE_ENV) ?? "development";
  const authModeDefault: ServiceAuthMode = nodeEnv === "production" ? "required" : "disabled";
  const authMode = parseEnum(env.KOTOBANK_AUTH_MODE, AUTH_MODES, "KOTOBANK_AUTH_MODE", authModeDefault);
  const bearerToken = readString(env.KOTOBANK_AUTH_TOKEN);

  if (authMode === "required" && !bearerToken) {
    throw new Error("KOTOBANK_AUTH_TOKEN is required when KOTOBANK_AUTH_MODE=required");
  }

  return {
    nodeEnv,
    port: parsePositiveInteger(
      firstDefined(readString(env.KOTOBANK_PORT), readString(env.PORT)),
      "KOTOBANK_PORT",
      DEFAULT_PORT,
    ),
    logLevel: parseEnum(env.KOTOBANK_LOG_LEVEL, LOG_LEVELS, "KOTOBANK_LOG_LEVEL", DEFAULT_LOG_LEVEL),
    requestTimeoutMs: parsePositiveInteger(
      env.KOTOBANK_REQUEST_TIMEOUT_MS,
      "KOTOBANK_REQUEST_TIMEOUT_MS",
      DEFAULT_REQUEST_TIMEOUT_MS,
    ),
    shutdownGracePeriodMs: parsePositiveInteger(
      env.KOTOBANK_SHUTDOWN_GRACE_PERIOD_MS,
      "KOTOBANK_SHUTDOWN_GRACE_PERIOD_MS",
      DEFAULT_SHUTDOWN_GRACE_PERIOD_MS,
    ),
    auth: {
      mode: authMode,
      bearerToken,
    },
    cache: {
      mode: parseEnum(env.KOTOBANK_CACHE_MODE, CACHE_MODES, "KOTOBANK_CACHE_MODE", "memory"),
      ttlMs: parsePositiveInteger(env.KOTOBANK_CACHE_TTL_MS, "KOTOBANK_CACHE_TTL_MS", DEFAULT_CACHE_TTL_MS),
      maxEntries: parsePositiveInteger(
        env.KOTOBANK_CACHE_MAX_ENTRIES,
        "KOTOBANK_CACHE_MAX_ENTRIES",
        DEFAULT_CACHE_MAX_ENTRIES,
      ),
    },
    rateLimit: {
      enabled: parsePositiveInteger(
        env.KOTOBANK_RATE_LIMIT_MAX_REQUESTS,
        "KOTOBANK_RATE_LIMIT_MAX_REQUESTS",
        DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      ) > 0,
      windowMs: parsePositiveInteger(
        env.KOTOBANK_RATE_LIMIT_WINDOW_MS,
        "KOTOBANK_RATE_LIMIT_WINDOW_MS",
        DEFAULT_RATE_LIMIT_WINDOW_MS,
      ),
      maxRequests: parsePositiveInteger(
        env.KOTOBANK_RATE_LIMIT_MAX_REQUESTS,
        "KOTOBANK_RATE_LIMIT_MAX_REQUESTS",
        DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      ),
    },
  };
}

function parsePositiveInteger(
  value: string | undefined,
  name: string,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} must not be empty`);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function parseEnum<Value extends string>(
  value: string | undefined,
  allowedValues: Set<Value>,
  name: string,
  fallback: Value,
): Value {
  if (value === undefined) {
    return fallback;
  }

  const trimmed = value.trim() as Value;
  if (!allowedValues.has(trimmed)) {
    throw new Error(`${name} must be one of: ${[...allowedValues].join(", ")}`);
  }

  return trimmed;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined);
}

function readString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
