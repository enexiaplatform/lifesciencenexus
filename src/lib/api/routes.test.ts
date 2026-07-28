import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handoffPayloadSchema } from "@/lib/integrations/memoire";
import { ATLAS_FORBIDDEN_FIELDS } from "@/lib/integrations/atlas";

import { resetRateLimitStoreForTests } from "./rate-limit";

import { GET as searchGET } from "@/app/api/v1/search/route";
import { GET as organizationsGET } from "@/app/api/v1/organizations/route";
import { GET as pricesGET } from "@/app/api/v1/prices/route";
import { GET as standardsGET } from "@/app/api/v1/standards/route";
import { GET as atlasProductsGET } from "@/app/api/v1/integrations/atlas/products/route";
import { GET as entityGET } from "@/app/api/v1/entities/[type]/[id]/route";
import { POST as handoffPOST } from "@/app/api/v1/integrations/memoire/handoff/route";

const tenantHeaders = { "x-nexus-tenant": "tenant_demo" };

function req(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, { headers });
}

beforeEach(() => {
  delete process.env.NEXUS_API_KEY;
  resetRateLimitStoreForTests();
});
afterEach(() => resetRateLimitStoreForTests());

describe("GET /api/v1/search", () => {
  it("rejects a missing q with the 400 error contract", async () => {
    const response = await searchGET(req("/api/v1/search"), undefined);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("bad_request");
    expect(body.error.message).toBeTruthy();
  });

  it("returns results with matchReasons for a real query", async () => {
    const response = await searchGET(req("/api/v1/search?q=Tryptic%20Soy%20Agar"), undefined);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.total).toBe(body.data.length);
    expect(body.data[0]).toHaveProperty("matchReasons");
    expect(body.data[0]).toHaveProperty("score");
  });

  it("rejects unknown entity types", async () => {
    const response = await searchGET(req("/api/v1/search?q=tsa&types=organization,bogus"), undefined);
    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/organizations", () => {
  it("paginates with meta", async () => {
    const response = await organizationsGET(req("/api/v1/organizations?pageSize=2&page=2"), undefined);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.pageSize).toBe(2);
    expect(body.meta.page).toBe(2);
    expect(body.meta.total).toBeGreaterThan(4);
    expect(body.data).toHaveLength(2);
  });

  it("filters by country", async () => {
    const response = await organizationsGET(req("/api/v1/organizations?country=VN"), undefined);
    const body = await response.json();
    expect(body.data.every((org: { country: string }) => org.country === "VN")).toBe(true);
  });

  it("rejects bad pagination params with the error contract", async () => {
    const response = await organizationsGET(req("/api/v1/organizations?page=abc"), undefined);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("bad_request");
  });
});

describe("GET /api/v1/prices visibility guard", () => {
  it("omits tenant_private rows without the tenant header", async () => {
    const response = await pricesGET(req("/api/v1/prices?pageSize=100"), undefined);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((price: { visibility: string }) => price.visibility === "canonical")).toBe(true);
    expect(body.data.some((price: { id: string }) => idIsTenantPrivateSeededPrice(price.id))).toBe(false);
  });

  it("includes tenant_private rows for the owning tenant", async () => {
    const response = await pricesGET(req("/api/v1/prices?pageSize=100", tenantHeaders), undefined);
    const body = await response.json();
    expect(body.data.some((price: { visibility: string }) => price.visibility === "tenant_private")).toBe(true);
  });

  it("clamps an explicit visibility=tenant_private filter for anonymous callers", async () => {
    const response = await pricesGET(req("/api/v1/prices?visibility=tenant_private"), undefined);
    const body = await response.json();
    expect(body.data.every((price: { visibility: string }) => price.visibility === "canonical")).toBe(true);
  });
});

function idIsTenantPrivateSeededPrice(id: string): boolean {
  return ["price-td-new", "price-td-old", "price-qc"].includes(id);
}

describe("GET /api/v1/integrations/atlas/products", () => {
  it("returns contract-versioned DTOs with NO price/commercial fields anywhere", async () => {
    const response = await atlasProductsGET(req("/api/v1/integrations/atlas/products"), undefined);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.contractVersion).toBe("nexus-atlas-read/v1");
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(body.data.data.length).toBeGreaterThan(0);
    // Deep-scan every key against the forbidden list (vendor neutrality).
    const forbidden = new Set(ATLAS_FORBIDDEN_FIELDS as readonly string[]);
    const stack: unknown[] = [body.data.data];
    while (stack.length > 0) {
      const value = stack.pop();
      if (Array.isArray(value)) {
        stack.push(...value);
      } else if (value !== null && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          expect(forbidden.has(key.toLowerCase())).toBe(false);
          stack.push(child);
        }
      }
    }
  });
});

describe("POST /api/v1/integrations/memoire/handoff", () => {
  it("returns a contract-valid payload and records the handoff", async () => {
    const response = await handoffPOST(
      new NextRequest("http://localhost/api/v1/integrations/memoire/handoff", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ entityType: "organization", entityId: "org-mekong-lab-supply" }),
      }),
      undefined,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    // Contract validation is the assertion: throws on any violation.
    const payload = handoffPayloadSchema.parse(body.data);
    expect(payload.entity.nexusEntityId).toBe("org-mekong-lab-supply");
    expect(payload.source.tenantId).toBe("tenant_demo");
    expect(body.meta.handoffRecordId).toBeTruthy();
  });

  it("404s for an unknown entity", async () => {
    const response = await handoffPOST(
      new NextRequest("http://localhost/api/v1/integrations/memoire/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: "organization", entityId: "org-does-not-exist" }),
      }),
      undefined,
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });

  it("422s for an invalid body", async () => {
    const response = await handoffPOST(
      new NextRequest("http://localhost/api/v1/integrations/memoire/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: "galaxy", entityId: 42 }),
      }),
      undefined,
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("unprocessable");
  });
});

describe("GET /api/v1/entities/[type]/[id]", () => {
  it("404s tenant-private records for anonymous callers", async () => {
    const response = await entityGET(req("/api/v1/entities/person/person-nguyen-van-an"), {
      params: Promise.resolve({ type: "person", id: "person-nguyen-van-an" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns them to the owning tenant", async () => {
    const response = await entityGET(req("/api/v1/entities/person/person-nguyen-van-an", tenantHeaders), {
      params: Promise.resolve({ type: "person", id: "person-nguyen-van-an" }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data.fullName).toBeTruthy();
  });

  it("404s unknown types", async () => {
    const response = await entityGET(req("/api/v1/entities/galaxy/x"), {
      params: Promise.resolve({ type: "galaxy", id: "x" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("rate limiting at the route level", () => {
  it("returns 429 with Retry-After after a 60-request burst", async () => {
    let lastStatus = 0;
    let retryAfter: string | null = null;
    for (let i = 0; i < 61; i += 1) {
      const response = await standardsGET(req("/api/v1/standards"), undefined);
      lastStatus = response.status;
      retryAfter = response.headers.get("Retry-After");
    }
    expect(lastStatus).toBe(429);
    expect(retryAfter).toBeTruthy();
  });
});
