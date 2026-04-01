import { timingSafeEqual } from "node:crypto";

import type { ServiceAuthConfig } from "./config.js";

export interface AuthFailure {
  readonly code: "UNAUTHORIZED";
  readonly message: string;
}

export type AuthResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly statusCode: 401; readonly error: AuthFailure };

export function authorizeBearerToken(
  authorizationHeader: string | undefined,
  config: ServiceAuthConfig,
): AuthResult {
  if (config.mode === "disabled") {
    return { ok: true };
  }

  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return unauthorized("Missing bearer token");
  }

  if (!config.bearerToken || !tokensMatch(token, config.bearerToken)) {
    return unauthorized("Invalid bearer token");
  }

  return { ok: true };
}

export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, ...tokenParts] = authorizationHeader.trim().split(/\s+/u);
  if (scheme?.toLowerCase() !== "bearer") {
    return undefined;
  }

  const token = tokenParts.join(" ");
  return token || undefined;
}

function unauthorized(message: string): AuthResult {
  return {
    ok: false,
    statusCode: 401,
    error: {
      code: "UNAUTHORIZED",
      message,
    },
  };
}

function tokensMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
