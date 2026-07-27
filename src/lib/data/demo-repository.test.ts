import { describe, expect, it } from "vitest";

import { DemoRepository } from "./demo-repository";

const FIXED_NOW = new Date("2026-07-01T00:00:00.000Z");

function repo() {
  return new DemoRepository({ tenantId: "tenant-test", userId: "user-test", now: () => FIXED_NOW });
}

describe("DemoRepository CRUD", () => {
  it("createEntity assigns audit fields and context defaults", async () => {
    const r = repo();
    const org = await r.createEntity("organization", {
      name: "VietLab",
      types: ["distributor"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    expect(org.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(org.createdAt).toBe(FIXED_NOW.toISOString());
    expect(org.createdBy).toBe("user-test");

    const person = await r.createEntity("person", {
      tenantId: "tenant-test",
      fullName: "Nguyen Van A",
      visibility: "tenant_private",
      isDemo: true,
    });
    expect(person.tenantId).toBe("tenant-test");
  });

  it("getById returns the entity or null", async () => {
    const r = repo();
    const org = await r.createEntity("organization", {
      name: "VietLab",
      types: ["distributor"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    expect((await r.getById("organization", org.id))?.name).toBe("VietLab");
    expect(await r.getById("organization", "missing")).toBeNull();
  });

  it("updateEntity merges patches and refreshes the audit stamp", async () => {
    const r = repo();
    const org = await r.createEntity("organization", {
      name: "VietLab",
      types: ["distributor"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    const updated = await r.updateEntity("organization", org.id, { website: "https://vietlab.vn" });
    expect(updated.website).toBe("https://vietlab.vn");
    expect(updated.name).toBe("VietLab");
    expect(updated.updatedAt).toBe(FIXED_NOW.toISOString());
    await expect(r.updateEntity("organization", "missing", { name: "x" })).rejects.toThrow(/not found/);
  });

  it("list paginates, filters, queries and hides archived records", async () => {
    const r = repo();
    for (const [name, country] of [
      ["Alpha", "VN"],
      ["Beta", "VN"],
      ["Gamma", "SG"],
    ] as const) {
      await r.createEntity("organization", {
        name,
        types: ["distributor"],
        country,
        identifiers: [],
        visibility: "canonical",
        isDemo: true,
      });
    }
    const page = await r.list("organization", { page: 1, pageSize: 2 });
    expect(page.total).toBe(3);
    expect(page.totalPages).toBe(2);
    expect(page.items).toHaveLength(2);

    const vnOnly = await r.list("organization", { filters: { country: "VN" } });
    expect(vnOnly.total).toBe(2);

    const queried = await r.list("organization", { query: "gamma" });
    expect(queried.total).toBe(1);

    const toArchive = vnOnly.items[0];
    await r.archiveEntity("organization", toArchive.id);
    const afterArchive = await r.list("organization", { filters: { country: "VN" } });
    expect(afterArchive.total).toBe(1);
    const withArchived = await r.list("organization", { filters: { country: "VN" }, includeArchived: true });
    expect(withArchived.total).toBe(2);
  });
});

describe("DemoRepository search", () => {
  it("finds SKUs by catalogue number with explainable reasons", async () => {
    const r = repo();
    const product = await r.createEntity("product", {
      familyId: "fam-1",
      manufacturerOrganizationId: "org-1",
      name: "Tryptic Soy Agar",
      category: "dehydrated_culture_media",
      status: "active",
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("sku", {
      productId: product.id,
      name: "TSA 500g bottle",
      catalogueNumber: "1.05458.0500",
      alternateNames: ["TSA powder"],
      countryAvailability: ["VN"],
      status: "active",
      visibility: "canonical",
      isDemo: true,
    });
    const results = await r.search("1054580500");
    expect(results[0].entityType).toBe("sku");
    expect(results[0].matchReasons.join(" ")).toMatch(/catalogue number match/);
    expect(results[0].visibility).toBe("canonical");
  });

  it("finds organizations through their aliases", async () => {
    const r = repo();
    const org = await r.createEntity("organization", {
      name: "Merck KGaA",
      types: ["manufacturer"],
      country: "DE",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("organization_alias", {
      organizationId: org.id,
      alias: "Millipore Sigma",
      source: "user",
      visibility: "canonical",
      isDemo: true,
    });
    const results = await r.search("Millipore Sigma");
    expect(results[0].id).toBe(org.id);
    expect(results[0].matchReasons.join(" ")).toMatch(/alias/);
  });
});

describe("DemoRepository detail aggregates", () => {
  it("getSkuDetail composes the full SKU graph", async () => {
    const r = repo();
    const manufacturer = await r.createEntity("organization", {
      name: "Merck",
      types: ["manufacturer"],
      country: "DE",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    const brand = await r.createEntity("brand", {
      ownerOrganizationId: manufacturer.id,
      name: "Millipore",
      visibility: "canonical",
      isDemo: true,
    });
    const family = await r.createEntity("product_family", {
      brandId: brand.id,
      name: "Granulated media",
      category: "dehydrated_culture_media",
      visibility: "canonical",
      isDemo: true,
    });
    const product = await r.createEntity("product", {
      familyId: family.id,
      manufacturerOrganizationId: manufacturer.id,
      name: "Tryptic Soy Agar",
      category: "dehydrated_culture_media",
      status: "active",
      visibility: "canonical",
      isDemo: true,
    });
    const sku = await r.createEntity("sku", {
      productId: product.id,
      name: "TSA 500g",
      catalogueNumber: "1.05458.0500",
      alternateNames: [],
      countryAvailability: ["VN"],
      status: "active",
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("pack_configuration", {
      skuId: sku.id,
      quantity: 500,
      unit: "g",
      description: "500 g bottle",
      visibility: "canonical",
      isDemo: true,
    });

    const detail = await r.getSkuDetail(sku.id);
    expect(detail?.sku.id).toBe(sku.id);
    expect(detail?.product?.id).toBe(product.id);
    expect(detail?.family?.id).toBe(family.id);
    expect(detail?.brand?.name).toBe("Millipore");
    expect(detail?.manufacturer?.id).toBe(manufacturer.id);
    expect(detail?.packConfigurations).toHaveLength(1);
    expect(await r.getSkuDetail("missing")).toBeNull();
  });

  it("getOrganizationDetail joins sites, labs, contacts and supplier profile", async () => {
    const r = repo();
    const org = await r.createEntity("organization", {
      name: "Pharma Co",
      types: ["pharmaceutical_company"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    const site = await r.createEntity("site", {
      organizationId: org.id,
      name: "HCMC factory",
      siteType: "factory",
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("laboratory", {
      siteId: site.id,
      name: "Micro lab",
      labType: "microbiology",
      visibility: "canonical",
      isDemo: true,
    });
    const detail = await r.getOrganizationDetail(org.id);
    expect(detail?.sites).toHaveLength(1);
    expect(detail?.laboratories).toHaveLength(1);
    expect(detail?.supplierProfile).toBeNull();
  });
});

describe("DemoRepository dashboard, signals and merges", () => {
  it("dashboardSummary reports counts, review queue and duplicates", async () => {
    const r = repo();
    await r.createEntity("organization", {
      name: "VietLab",
      types: ["distributor"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("claim", {
      subjectEntityType: "sku",
      subjectEntityId: "sku-1",
      predicate: "distributed_by",
      objectValue: "org-1",
      sourceId: "src-1",
      confidence: {
        sourceAuthority: 0.5,
        sourceRecency: 0.5,
        entityMatch: 0.5,
        extraction: 0.5,
        technicalEquivalence: 0.5,
        geographicRelevance: 0.5,
        commercialRelevance: 0.5,
      },
      reviewStatus: "unverified",
      contradictingClaimIds: [],
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("duplicate_candidate", {
      entityType: "organization",
      leftId: "a",
      rightId: "b",
      score: 0.9,
      matchedOn: ["name token overlap 0.90"],
      status: "pending",
      visibility: "canonical",
      isDemo: true,
    });
    const summary = await r.dashboardSummary();
    expect(summary.counts.organization).toBe(1);
    expect(summary.reviewQueueSize).toBe(1);
    expect(summary.possibleDuplicates).toBe(1);
    expect(summary.highValueSignals).toEqual([]);
  });

  it("acknowledgeSignal and dismissSignal update status", async () => {
    const r = repo();
    const signal = await r.createEntity("opportunity_signal", {
      tenantId: "tenant-test",
      type: "price_stale",
      relatedEntities: [{ entityType: "sku", entityId: "sku-1" }],
      triggeringRecordIds: ["po-1"],
      reason: "Price is 200 days old.",
      confidence: 0.8,
      commercialRelevance: "medium",
      generatedAt: FIXED_NOW.toISOString(),
      recommendedAction: "Request a fresh quotation.",
      status: "new",
      visibility: "tenant_private",
      isDemo: true,
    });
    expect((await r.acknowledgeSignal(signal.id)).status).toBe("acknowledged");
    expect((await r.dismissSignal(signal.id)).status).toBe("dismissed");
    const listed = await r.listSignals({ filters: { status: "dismissed" } });
    expect(listed.total).toBe(1);
  });

  it("mergeEntities preserves aliases, archives the loser and records the event", async () => {
    const r = repo();
    const survivor = await r.createEntity("organization", {
      name: "Merck KGaA",
      types: ["manufacturer"],
      country: "DE",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    const loser = await r.createEntity("organization", {
      name: "Merck Vietnam",
      types: ["manufacturer"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    await r.createEntity("duplicate_candidate", {
      entityType: "organization",
      leftId: survivor.id,
      rightId: loser.id,
      score: 0.9,
      matchedOn: ["name token overlap 0.90"],
      status: "pending",
      visibility: "canonical",
      isDemo: true,
    });

    const event = await r.mergeEntities({ entityType: "organization", survivorId: survivor.id, mergedId: loser.id });
    expect(event.survivorId).toBe(survivor.id);
    expect(event.mergedId).toBe(loser.id);
    expect(event.aliasPreservation).toBe(true);
    expect(event.redirectCreated).toBe(true);

    // Loser archived, redirect stored, alias preserved on the survivor.
    expect((await r.getById("organization", loser.id))?.archivedAt).toBe(FIXED_NOW.toISOString());
    expect(r.getRedirect("organization", loser.id)).toBe(survivor.id);
    const detail = await r.getOrganizationDetail(survivor.id);
    expect(detail?.aliases.map((alias) => alias.alias)).toContain("Merck Vietnam");

    // The duplicate candidate is marked merged, and search resolves the old name.
    const candidates = await r.listDuplicateCandidates();
    expect(candidates.items[0].status).toBe("merged");
    const results = await r.search("Merck Vietnam");
    expect(results[0].id).toBe(survivor.id);
  });
});
