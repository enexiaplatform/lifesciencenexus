import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { authenticate, API_KEY_HEADER, DEMO_TENANT_HEADER } from "./auth";
import { checkRateLimit, resetRateLimitStoreForTests, DEFAULT_RATE_LIMIT } from "./rate-limit";
import { badRequest, notFound, ok, pageMeta, rateLimited } from "./respond";
import { commaList, listQuerySchema, parseQuery } from "./validate";

describe("respond envelope", () => {
  it("success envelope: {data, meta}", async () => {
    const response = ok([1, 2], pageMeta({ page: 1, pageSize: 25, total: 2, totalPages: 1 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([1, 2]);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 25, total: 2, totalPages: 1 });
  });

  it("error contract: {error:{code,message,details?}} with HTTP status", async () => {
    const bad = badRequest("Nope", [{ path: "q", message: "required" }]);
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatchObject({ code: "bad_request", message: "Nope" });

    const missing = notFound("gone");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("not_found");

    const limited = rateLimited(42);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("42");
    expect((await limited.json()).error.code).toBe("rate_limited");
  });
});

describe("authenticate", () => {
  const originalKey = process.env.NEXUS_API_KEY;
  beforeEach(() => {
    if (originalKey === undefined) delete process.env.NEXUS_API_KEY;
    else process.env.NEXUS_API_KEY = originalKey;
  });

  it("demo mode (no NEXUS_API_KEY): allows keyless requests, tenant from header only", () => {
    delete process.env.NEXUS_API_KEY;
    const anonymous = authenticate(new NextRequest("http://localhost/api/v1/prices"));
    expect(anonymous.ok).toBe(true);
    if (anonymous.ok) {
      expect(anonymous.auth.mode).toBe("demo");
      expect(anonymous.auth.tenantId).toBeNull();
    }

    const asTenant = authenticate(
      new NextRequest("http://localhost/api/v1/prices", { headers: { [DEMO_TENANT_HEADER]: "tenant_demo" } }),
    );
    expect(asTenant.ok && asTenant.auth.tenantId).toBe("tenant_demo");
  });

  it("api-key mode: rejects missing/wrong keys with 401, accepts the right key", () => {
    process.env.NEXUS_API_KEY = "test-secret";
    const missing = authenticate(new NextRequest("http://localhost/api/v1/prices"));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.response.status).toBe(401);

    const wrong = authenticate(
      new NextRequest("http://localhost/api/v1/prices", { headers: { [API_KEY_HEADER]: "nope" } }),
    );
    expect(wrong.ok).toBe(false);

    const right = authenticate(
      new NextRequest("http://localhost/api/v1/prices", { headers: { [API_KEY_HEADER]: "test-secret" } }),
    );
    expect(right.ok).toBe(true);
    if (right.ok) expect(right.auth.mode).toBe("api_key");
  });
});

describe("rate limiter", () => {
  beforeEach(() => resetRateLimitStoreForTests());

  it("allows up to the limit, then denies with Retry-After", () => {
    const now = 1_000_000;
    for (let i = 0; i < DEFAULT_RATE_LIMIT; i += 1) {
      expect(checkRateLimit("k:route", { now }).allowed).toBe(true);
    }
    const denied = checkRateLimit("k:route", { now });
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("refills after the window rolls over (injected clock)", () => {
    const now = 1_000_000;
    expect(checkRateLimit("k:route", { limit: 1, now }).allowed).toBe(true);
    expect(checkRateLimit("k:route", { limit: 1, now: now + 1 }).allowed).toBe(false);
    expect(checkRateLimit("k:route", { limit: 1, now: now + 61_000 }).allowed).toBe(true);
  });

  it("tracks buckets per key", () => {
    const now = 1_000_000;
    expect(checkRateLimit("a:route", { limit: 1, now }).allowed).toBe(true);
    expect(checkRateLimit("b:route", { limit: 1, now }).allowed).toBe(true);
    expect(checkRateLimit("a:route", { limit: 1, now }).allowed).toBe(false);
  });
});

describe("query validation", () => {
  it("parses pagination defaults and clamps pageSize", () => {
    const request = new NextRequest("http://localhost/api/v1/x?pageSize=500");
    const parsed = parseQuery(request, listQuerySchema);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBeLessThanOrEqual(100);
    }
  });

  it("rejects malformed query params with the 400 error contract", async () => {
    const request = new NextRequest("http://localhost/api/v1/x?page=abc");
    const parsed = parseQuery(request, listQuerySchema);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      const body = await parsed.response.json();
      expect(body.error.code).toBe("bad_request");
      expect(Array.isArray(body.error.details)).toBe(true);
    }
  });

  it("commaList splits and trims", () => {
    expect(commaList("a, b ,,c")).toEqual(["a", "b", "c"]);
    expect(commaList(undefined)).toEqual([]);
  });
});
