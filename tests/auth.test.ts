import { describe, expect, it } from "vitest";

import { authorizeBearerToken, extractBearerToken } from "../src/auth.js";

describe("extractBearerToken", () => {
  it("extracts bearer tokens case-insensitively", () => {
    expect(extractBearerToken("Bearer secret")).toBe("secret");
    expect(extractBearerToken("bearer secret")).toBe("secret");
  });

  it("returns undefined for unsupported headers", () => {
    expect(extractBearerToken(undefined)).toBeUndefined();
    expect(extractBearerToken("Basic abc")).toBeUndefined();
  });
});

describe("authorizeBearerToken", () => {
  it("allows requests when auth is disabled", () => {
    expect(authorizeBearerToken(undefined, { mode: "disabled" })).toEqual({ ok: true });
  });

  it("rejects missing or invalid tokens", () => {
    expect(authorizeBearerToken(undefined, { mode: "required", bearerToken: "secret" })).toEqual({
      ok: false,
      statusCode: 401,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      },
    });
    expect(authorizeBearerToken("Bearer wrong", { mode: "required", bearerToken: "secret" })).toEqual({
      ok: false,
      statusCode: 401,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid bearer token",
      },
    });
  });

  it("accepts matching bearer tokens", () => {
    expect(authorizeBearerToken("Bearer secret", { mode: "required", bearerToken: "secret" })).toEqual({
      ok: true,
    });
  });
});
