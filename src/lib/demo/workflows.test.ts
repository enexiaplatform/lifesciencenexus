import { describe, expect, it } from "vitest";

import { createDemoRepository, type DemoRepository } from "@/lib/data/demo-repository";
import { calculateCostPerTest } from "@/lib/domain/cost-per-test";
import { EQUIVALENCE_DIMENSIONS, type SignalType } from "@/lib/domain/types";

import {
  ASSETS,
  DEMO_TENANT_ID,
  EQUIVALENCES,
  ORGS,
  OTHER_TENANT_ID,
  PEOPLE,
  PRODUCTS,
  RESEARCH,
  SKUS,
  TENDER,
  USERS,
  VALIDATIONS,
  VENDOR_APPROVALS,
} from "./ids";

const FIXED_NOW = new Date("2026-07-01T00:00:00.000Z");

function repo(tenantId: string = DEMO_TENANT_ID): DemoRepository {
  return createDemoRepository({ tenantId, userId: USERS.demoAnalyst, now: () => FIXED_NOW });
}

describe("workflow 1 — research a product", () => {
  it("resolves the complete SKU chain with names, packs, edges, listings, prices and documents", async () => {
    const detail = await repo().getSkuDetail(SKUS.tsa500);
    expect(detail).not.toBeNull();
    expect(detail?.product?.name).toBe("Tryptic Soy Agar (TSA) (Demo)");
    expect(detail?.family?.name).toBe("AcmeDehydra dehydrated media (Demo)");
    expect(detail?.family?.category).toBe("dehydrated_culture_media");
    expect(detail?.brand?.name).toBe("Acme Media (Demo)");
    expect(detail?.manufacturer?.name).toBe("Acme MicroMedia (Demo)");
    expect(detail?.format?.form).toBe("granulated");

    expect(detail?.packConfigurations).toHaveLength(1);
    expect(detail?.packConfigurations[0]).toMatchObject({ quantity: 500, unit: "g", description: "500 g bottle" });

    expect(detail?.edges.length).toBeGreaterThanOrEqual(10);
    for (const edge of detail?.edges ?? []) {
      expect(edge.targetName, `edge ${edge.id} target name`).toBeTruthy();
    }
    expect(detail?.edges.some((edge) => edge.targetType === "standard" && edge.targetName === "ISO 11133")).toBe(true);
    expect(detail?.edges.some((edge) => edge.targetType === "organism" && edge.targetName?.includes("ATCC 8739"))).toBe(
      true,
    );

    expect(detail?.listings.length).toBeGreaterThanOrEqual(1);
    expect(detail?.listings[0].supplierName).toBe("Mekong Lab Supply (Demo)");

    expect(detail?.prices.length).toBeGreaterThanOrEqual(2);
    const dates = (detail?.prices ?? []).map((price) => price.observationDate);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(detail?.prices[0]?.isSynthetic).toBe(true);
    expect(detail?.prices[0]?.normalizedPerUnitAmount).not.toBeNull();

    expect(detail?.documents.length).toBeGreaterThanOrEqual(2);
    expect(await repo().getSkuDetail("sku-missing")).toBeNull();
  });

  it("shows availability-style commercial data per SKU", async () => {
    const detail = await repo().getSkuDetail(SKUS.tsaDelta500);
    // Both DeltaBio prices are tenant_private — visible to the demo tenant.
    expect(detail?.prices).toHaveLength(2);
    expect(detail?.prices.every((price) => price.visibility === "tenant_private")).toBe(true);
  });
});

describe("workflow 2 — compare equivalents", () => {
  it("seeds a functional_equivalent (~78) and a closest_alternative (~60) with full dimension detail", async () => {
    const r = repo();
    const records = (await r.list("equivalence_record", { pageSize: 50 })).items;
    expect(records).toHaveLength(4);

    const functional = records.find((record) => record.id === EQUIVALENCES.tsaDeltaVsAcme);
    expect(functional?.classification).toBe("functional_equivalent");
    expect(functional?.overallScore).toBeGreaterThanOrEqual(75);
    expect(functional?.overallScore).toBeLessThan(85);
    for (const dimension of EQUIVALENCE_DIMENSIONS) {
      expect(functional?.dimensionScores[dimension].score).not.toBeNull();
      expect(functional?.dimensionScores[dimension].weight).toBeGreaterThan(0);
    }
    expect(functional?.differences.length).toBeGreaterThanOrEqual(2);
    expect(functional?.validationConsiderations.length).toBeGreaterThanOrEqual(2);
    expect(functional?.reviewState).toBe("analyst_reviewed");
    for (const claimId of functional?.evidenceClaimIds ?? []) {
      expect(await r.getById("claim", claimId)).not.toBeNull();
    }

    const alternative = records.find((record) => record.id === EQUIVALENCES.sdaVsTsaPlates);
    expect(alternative?.classification).toBe("closest_alternative");
    expect(alternative?.overallScore).toBeGreaterThanOrEqual(55);
    expect(alternative?.overallScore).toBeLessThan(65);
    expect(alternative?.differences.some((difference) => difference.severity === "major")).toBe(true);

    // Equipment and assay equivalences added in the depth wave.
    const equipment = records.find((record) => record.id === EQUIVALENCES.st200VsSp3000);
    expect(equipment?.classification).toBe("functional_equivalent");
    expect(equipment?.overallScore).toBeGreaterThanOrEqual(70);
    expect(equipment?.overallScore).toBeLessThan(80);
    for (const dimension of EQUIVALENCE_DIMENSIONS) {
      expect(equipment?.dimensionScores[dimension].score).not.toBeNull();
    }

    const assay = records.find((record) => record.id === EQUIVALENCES.rfcVsLal);
    expect(assay?.classification).toBe("closest_alternative");
    expect(assay?.overallScore).toBeGreaterThanOrEqual(55);
    expect(assay?.overallScore).toBeLessThan(70);
    expect(assay?.differences.some((difference) => difference.severity === "major")).toBe(true);
  });

  it("marks the discontinued competitor SKU with a successor", async () => {
    const r = repo();
    const legacy = await r.getById("sku", SKUS.naOld500);
    expect(legacy?.status).toBe("discontinued");
    expect(legacy?.successorSkuId).toBe(SKUS.na2x500);
    expect((await r.getById("product", PRODUCTS.naDeltaOld))?.successorProductId).toBe(PRODUCTS.naDelta);
  });
});

describe("workflow 3 — cost per test", () => {
  it("computes both seeded scenarios (dehydrated 500 g vs ready plates 20/pack)", async () => {
    const scenarios = (await repo().list("cost_per_test_scenario", { pageSize: 50 })).items;
    expect(scenarios).toHaveLength(4);
    const results = scenarios.map((scenario) => ({ scenario, result: calculateCostPerTest(scenario.input) }));
    for (const { result } of results) {
      expect(result.effectiveCostPerTest).toBeGreaterThan(0);
      expect(result.currency).toBe("VND");
      expect(result.usableTests).toBeGreaterThan(0);
      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.assumptions.length).toBeGreaterThan(0);
    }
    // The dehydrated bottle yields far more tests per pack than the plate pack.
    const dehydrated = results.find((entry) => entry.scenario.skuId === SKUS.tsa500)?.result;
    const plates = results.find((entry) => entry.scenario.skuId === SKUS.tsaPlates20)?.result;
    expect(dehydrated?.usableTests).toBeGreaterThan(plates?.usableTests ?? 0);

    // BET assays: per-test reagent cost is lower for the rFC kit despite the
    // higher kit price, even after fluorometer allocation.
    const lal = results.find((entry) => entry.scenario.skuId === SKUS.lalCart50)?.result;
    const rfc = results.find((entry) => entry.scenario.skuId === SKUS.endoZyme192)?.result;
    // usableTests already nets out waste/repeat rates, so it sits below the
    // nominal kit sizes (50 and 192) — and the rFC kit still yields far more.
    expect(lal?.usableTests).toBeLessThan(50);
    expect(rfc?.usableTests).toBeLessThanOrEqual(192);
    expect(rfc?.usableTests ?? 0).toBeGreaterThan((lal?.usableTests ?? 0) * 3);
    expect(rfc?.effectiveCostPerTest ?? Infinity).toBeLessThan(lal?.effectiveCostPerTest ?? 0);
  });
});

describe("workflow 4 — map a market account", () => {
  it("maps Delta Pharma Plant HCMC with site, lab, line, people and decision roles", async () => {
    const r = repo();
    const detail = await r.getOrganizationDetail(ORGS.deltaPharma);
    expect(detail?.sites).toHaveLength(1);
    expect(detail?.sites[0].name).toContain("Binh Chanh");
    expect(detail?.laboratories).toHaveLength(1);
    expect(detail?.laboratories[0].labType).toBe("microbiology");

    const lines = await r.list("production_line", { filters: { siteId: detail?.sites[0].id ?? "" } });
    expect(lines.total).toBe(1);

    expect(detail?.contacts).toHaveLength(2);
    const names = detail?.contacts.map((contact) => contact.person?.fullName) ?? [];
    expect(names).toContain("Nguyen Van An (Demo)");
    expect(names).toContain("Tran Thi Binh (Demo)");
    const an = detail?.contacts.find((contact) => contact.person?.id === PEOPLE.nguyenVanAn);
    expect(an?.decisionRoles).toEqual(expect.arrayContaining(["qa_approver", "technical_evaluator"]));
    expect(detail?.contacts.every((contact) => contact.visibility === "tenant_private")).toBe(true);
  });

  it("details both installed assets — one with consumables, one deliberately without", async () => {
    const r = repo();
    const airSampler = await r.getAssetDetail(ASSETS.as100);
    expect(airSampler?.model?.model).toBe("AirSampler AS-100 (Demo)");
    expect(airSampler?.site?.name).toContain("Binh Chanh");
    expect(airSampler?.laboratory?.labType).toBe("microbiology");
    expect(airSampler?.compatibleConsumables.length).toBeGreaterThanOrEqual(1);
    expect(airSampler?.compatibleConsumables.every((entry) => entry.sku !== null)).toBe(true);
    expect(airSampler?.lifecycleEvents.length).toBeGreaterThanOrEqual(1);
    expect(airSampler?.maintenanceEvents).toHaveLength(1);
    expect(airSampler?.qualificationEvents).toHaveLength(1);
    expect(airSampler?.asset.expectedReplacementDate).toBeTruthy();

    const particleCounter = await r.getAssetDetail(ASSETS.pc50);
    expect(particleCounter?.compatibleConsumables).toHaveLength(0);
  });

  it("tracks vendor approvals (expired + approved) and an in-progress validation", async () => {
    const r = repo();
    const approvals = (await r.list("vendor_approval", { pageSize: 50 })).items;
    expect(approvals.find((approval) => approval.id === VENDOR_APPROVALS.mekongExpired)?.status).toBe("expired");
    expect(approvals.find((approval) => approval.id === VENDOR_APPROVALS.saigonApproved)?.status).toBe("approved");

    const validations = (await r.list("product_validation", { pageSize: 50 })).items;
    expect(validations.find((validation) => validation.id === VALIDATIONS.tdInProgress)?.status).toBe("in_progress");
    expect(validations.find((validation) => validation.id === VALIDATIONS.tsaPassed)?.status).toBe("passed");
  });
});

describe("workflow 5 — record tender intelligence", () => {
  it("resolves the tender with lots, items, bidders, award, events and source document", async () => {
    const r = repo();
    const detail = await r.getTenderDetail(TENDER.tender);
    expect(detail?.tender.status).toBe("awarded");
    expect(detail?.buyer?.name).toBe("Red River Provincial Hospital (Demo)");
    expect(detail?.lots).toHaveLength(2);
    expect(detail?.items).toHaveLength(3);
    expect(detail?.items.every((item) => item.mappedSkuId !== undefined)).toBe(true);
    expect(detail?.bidders).toHaveLength(2);
    expect(detail?.awards).toHaveLength(1);
    expect(detail?.awards[0]).toMatchObject({ amount: 1_850_000_000, currency: "VND" });
    expect(detail?.events.length).toBeGreaterThanOrEqual(3);

    expect(await r.getById("source", detail?.tender.sourceId ?? "")).not.toBeNull();
    const documents = await r.list("source_document", { pageSize: 50 });
    expect(documents.items.some((doc) => doc.sourceId === detail?.tender.sourceId)).toBe(true);
  });
});

describe("workflow 6 — ingest, duplicates and merge", () => {
  it("creates, updates and archives entities in memory on the seeded dataset", async () => {
    const r = repo();
    const before = (await r.list("organization", { pageSize: 100 })).total;

    const org = await r.createEntity("organization", {
      name: "Imported Distributor (Demo)",
      types: ["distributor"],
      country: "VN",
      identifiers: [],
      visibility: "canonical",
      isDemo: true,
    });
    expect((await r.list("organization", { pageSize: 100 })).total).toBe(before + 1);

    const updated = await r.updateEntity("organization", org.id, { website: "https://imported.example.vn" });
    expect(updated.website).toBe("https://imported.example.vn");
    expect(updated.updatedAt).toBe(FIXED_NOW.toISOString());

    const sku = await r.createEntity("sku", {
      productId: PRODUCTS.tsaAcme,
      name: "Imported SKU (Demo)",
      catalogueNumber: "IMP-0001",
      alternateNames: [],
      countryAvailability: ["VN"],
      status: "active",
      visibility: "canonical",
      isDemo: true,
    });
    const source = await r.createEntity("source", {
      type: "internal_note",
      title: "Import batch note (Demo)",
      capturedAt: FIXED_NOW.toISOString(),
      visibility: "canonical",
      isDemo: true,
    });
    const price = await r.createEntity("price_observation", {
      skuId: sku.id,
      originalAmount: 1_000_000,
      originalCurrency: "VND",
      observationDate: "2026-06-01",
      taxIncluded: false,
      geography: "VN",
      quantity: 1,
      sourceId: source.id,
      confidence: {
        sourceAuthority: 0.5,
        sourceRecency: 0.5,
        entityMatch: 0.5,
        extraction: 0.5,
        technicalEquivalence: 0.5,
        geographicRelevance: 0.5,
        commercialRelevance: 0.5,
      },
      evidenceState: "unverified",
      isSynthetic: true,
      visibility: "canonical",
      isDemo: true,
    });
    expect(price.id).toBeTruthy();
    const claim = await r.createEntity("claim", {
      subjectEntityType: "sku",
      subjectEntityId: sku.id,
      predicate: "has_price",
      objectValue: { amount: 1_000_000, currency: "VND" },
      sourceId: source.id,
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
    expect(claim.id).toBeTruthy();

    const archived = await r.archiveEntity("price_observation", price.id);
    expect(archived.archivedAt).toBe(FIXED_NOW.toISOString());
    expect((await r.list("price_observation", { filters: { skuId: sku.id } })).total).toBe(0);
  });

  it("lists the seeded duplicate candidates with explanations and merges the org pair", async () => {
    const r = repo();
    const candidates = await r.listDuplicateCandidates({ pageSize: 50 });
    expect(candidates.total).toBeGreaterThanOrEqual(2);
    for (const candidate of candidates.items) {
      expect(candidate.matchedOn.length).toBeGreaterThan(0);
    }
    const orgCandidate = candidates.items.find((candidate) => candidate.entityType === "organization");
    expect(orgCandidate?.matchedOn.join(" ")).toMatch(/domain match|alias exact match/);

    const event = await r.mergeEntities({
      entityType: "organization",
      survivorId: ORGS.mekong,
      mergedId: ORGS.mekongDup,
    });
    expect(event.aliasPreservation).toBe(true);
    expect(event.redirectCreated).toBe(true);
    expect(r.getRedirect("organization", ORGS.mekongDup)).toBe(ORGS.mekong);
    expect((await r.getById("organization", ORGS.mekongDup))?.archivedAt).toBeTruthy();

    const after = await r.listDuplicateCandidates({ pageSize: 50 });
    expect(after.items.find((candidate) => candidate.id === orgCandidate?.id)?.status).toBe("merged");
  });
});

describe("signals and dashboard", () => {
  it("computes at least five signal types, including replacement-due and tender-renewal", async () => {
    const signals = await repo().listSignals({ pageSize: 100 });
    const types = new Set(signals.items.map((signal) => signal.type));
    expect(types.size).toBeGreaterThanOrEqual(5);

    const expected: SignalType[] = [
      "equipment_replacement_due",
      "tender_renewal_expected",
      "supplier_agreement_expired",
      "price_stale",
      "competitor_product_discontinued",
      "asset_without_consumables",
      "vendor_approval_gap",
      "validation_pending",
    ];
    for (const type of expected) {
      expect(types.has(type), `signal type ${type}`).toBe(true);
    }
    for (const signal of signals.items) {
      expect(signal.triggeringRecordIds.length).toBeGreaterThan(0);
      expect(signal.reason).toBeTruthy();
      expect(signal.status).toBe("new");
      expect(signal.isDemo).toBe(true);
    }
  });

  it("keeps acknowledge/dismiss state in memory across calls", async () => {
    const r = repo();
    const signals = await r.listSignals({ pageSize: 100 });
    const target = signals.items[0];

    expect((await r.acknowledgeSignal(target.id)).status).toBe("acknowledged");
    let listed = await r.listSignals({ filters: { status: "acknowledged" }, pageSize: 100 });
    expect(listed.items.some((signal) => signal.id === target.id)).toBe(true);

    expect((await r.dismissSignal(target.id)).status).toBe("dismissed");
    listed = await r.listSignals({ filters: { status: "dismissed" }, pageSize: 100 });
    expect(listed.total).toBe(1);
    expect(listed.items[0].id).toBe(target.id);

    await expect(r.acknowledgeSignal("sig-missing")).rejects.toThrow(/not found/);
  });

  it("reports a dashboard summary computed from the dataset", async () => {
    const summary = await repo().dashboardSummary();
    expect(summary.counts.organization).toBeGreaterThanOrEqual(10);
    expect(summary.counts.sku).toBeGreaterThanOrEqual(10);
    expect(summary.counts.opportunity_signal).toBeGreaterThanOrEqual(5);
    expect(summary.reviewQueueSize).toBeGreaterThan(0);
    expect(summary.freshness.stalePrices).toBeGreaterThan(0);
    expect(summary.freshness.reviewDueClaims).toBeGreaterThan(0);
    expect(summary.freshness.expiringAgreements).toBeGreaterThan(0);
    expect(summary.possibleDuplicates).toBeGreaterThanOrEqual(2);
    expect(summary.highValueSignals.length).toBeGreaterThan(0);
    for (const signal of summary.highValueSignals) {
      expect(signal.commercialRelevance).toBe("high");
      expect(signal.status).toBe("new");
    }
  });
});

describe("search across the seeded graph", () => {
  it("finds SKUs for 'ready plates' with match reasons", async () => {
    const results = await repo().search("ready plates");
    const skuHits = results.filter((hit) => hit.entityType === "sku");
    expect(skuHits.length).toBeGreaterThanOrEqual(1);
    expect(skuHits[0].matchReasons.length).toBeGreaterThan(0);
    expect(skuHits[0].isDemo).toBe(true);
  });

  it("ranks an exact catalogue number match first", async () => {
    const results = await repo().search("CLW-AS100");
    expect(results[0].entityType).toBe("sku");
    expect(results[0].id).toBe(SKUS.airAs100);
    expect(results[0].matchReasons.join(" ")).toMatch(/catalogue number match/);
  });

  it("covers more entity families: tenders, organisms, sources, research projects, people", async () => {
    const r = repo();
    expect((await r.search("RRH-2025-014"))[0]?.entityType).toBe("tender");
    expect((await r.search("Bacillus subtilis"))[0]?.entityType).toBe("organism");
    expect((await r.search("quotation Q-2026-014")).some((hit) => hit.entityType === "source")).toBe(true);
    expect((await r.search("ready-prepared media market"))[0]?.entityType).toBe("research_project");
    const people = await r.search("Nguyen Van An", { types: ["person"] });
    expect(people[0]?.id).toBe(PEOPLE.nguyenVanAn);
    expect(people[0]?.visibility).toBe("tenant_private");
  });
});

describe("research workspace", () => {
  it("details the project with notes, five finding kinds, entity links and an export", async () => {
    const r = repo();
    const detail = await r.getResearchProjectDetail(RESEARCH.project);
    expect(detail?.project.question).toContain("ready-prepared media");
    expect(detail?.notes).toHaveLength(2);
    expect(detail?.findings).toHaveLength(5);
    const kinds = new Set(detail?.findings.map((finding) => finding.kind));
    expect(kinds).toEqual(
      new Set(["verified_fact", "analyst_interpretation", "assumption", "unknown", "recommendation"]),
    );
    const fact = detail?.findings.find((finding) => finding.kind === "verified_fact");
    expect(fact?.evidenceClaimIds.length).toBeGreaterThan(0);
    expect(detail?.entities.length).toBeGreaterThanOrEqual(3);
    expect(detail?.exports).toHaveLength(1);

    const views = await r.list("saved_view", { pageSize: 50 });
    expect(views.items.some((view) => view.id === RESEARCH.savedView)).toBe(true);
  });
});

describe("tenant isolation", () => {
  it("hides tenant_demo private records from tenant_other", async () => {
    const other = repo(OTHER_TENANT_ID);

    expect((await other.list("person", { pageSize: 50 })).items.map((person) => person.id)).toEqual([
      PEOPLE.phamThiLan,
    ]);
    expect(await other.getById("person", PEOPLE.nguyenVanAn)).toBeNull();
    expect((await other.list("installed_asset", { pageSize: 50 })).total).toBe(0);
    expect((await other.list("research_project", { pageSize: 50 })).items.map((project) => project.id)).toEqual([
      RESEARCH.otherProject,
    ]);
    expect(await other.getResearchProjectDetail(RESEARCH.project)).toBeNull();

    const summary = await other.dashboardSummary();
    expect(summary.counts.installed_asset).toBeUndefined();
    expect(summary.counts.person).toBe(1);
    // Canonical shared-graph records stay visible to the other tenant.
    expect(summary.counts.organization).toBeGreaterThanOrEqual(10);

    // Tenant-private prices belong to the demo tenant.
    const skuDetail = await other.getSkuDetail(SKUS.tsaDelta500);
    expect(skuDetail?.prices).toHaveLength(0);

    const people = await other.search("Nguyen Van An", { types: ["person"] });
    expect(people).toHaveLength(0);
  });

  it("hides tenant_other private records from the demo tenant", async () => {
    const demo = repo();
    expect(await demo.getById("person", PEOPLE.phamThiLan)).toBeNull();
    expect(await demo.getById("research_project", RESEARCH.otherProject)).toBeNull();
    expect(
      (await demo.list("research_project", { pageSize: 50 })).items.some(
        (project) => project.id === RESEARCH.otherProject,
      ),
    ).toBe(false);
    const projects = await demo.search("Competitor watch", { types: ["research_project"] });
    expect(projects).toHaveLength(0);
  });
});
