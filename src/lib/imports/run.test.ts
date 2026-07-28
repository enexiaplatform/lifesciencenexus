import { beforeEach, describe, expect, it } from "vitest";

import { createDemoRepository, type DemoRepository } from "@/lib/data/demo-repository";

import { findImportDuplicates, runImport, type RunImportInput } from "./run";

function baseInput(overrides: Partial<RunImportInput>): RunImportInput {
  return {
    kind: "organizations",
    rows: [],
    fileName: "test.csv",
    visibility: "tenant_private",
    importValidOnly: true,
    tenantId: "tenant_demo",
    actorId: "user_demo_owner",
    ...overrides,
  };
}

describe("runImport", () => {
  let repo: DemoRepository;
  beforeEach(() => {
    repo = createDemoRepository();
  });

  it("creates organizations, skips exact duplicates, and writes a batch audit entry", async () => {
    const rows = [
      { name: "Test Import Org", types: "distributor", country: "VN" },
      // Exact duplicate of the seeded org (same normalized name + country).
      { name: "Mekong Lab Supply (Demo)", types: "distributor", country: "VN" },
    ];
    const result = await runImport(repo, baseInput({ rows }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.created).toBe(1);
    expect(result.report.skipped).toBe(1);
    expect(result.report.failed).toBe(0);

    const created = await repo.getById("organization", result.report.createdEntityIds[0]);
    expect(created?.name).toBe("Test Import Org");
    expect(created?.visibility).toBe("tenant_private");

    const batches = await repo.list("audit_log_entry", {
      filters: { action: "import.batch.completed" },
      pageSize: 10,
    });
    expect(batches.total).toBe(1);
    expect((batches.items[0].metadata as { batchId?: string }).batchId).toBe(result.report.batchId);
  });

  it("is idempotent: re-importing the same file skips every row", async () => {
    const rows = [{ name: "Test Import Org", types: "distributor", country: "VN" }];
    const first = await runImport(repo, baseInput({ rows }));
    expect(first.ok && first.report.created).toBe(1);
    const second = await runImport(repo, baseInput({ rows }));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.report.created).toBe(0);
    expect(second.report.skipped).toBe(1);
    expect(second.report.rows[0].message).toMatch(/exact duplicate/i);
  });

  it("resolves references by name and rejects unknown ones", async () => {
    const good = await runImport(
      repo,
      baseInput({
        kind: "sites",
        rows: [{ organization: "Mekong Lab Supply (Demo)", name: "New Test Warehouse", siteType: "warehouse" }],
      }),
    );
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.report.created).toBe(1);
      const site = await repo.getById("site", good.report.createdEntityIds[0]);
      expect(site?.organizationId).toBe("org-mekong-lab-supply");
    }

    const bad = await runImport(
      repo,
      baseInput({
        kind: "sites",
        rows: [{ organization: "Nonexistent Org XYZ", name: "Nowhere", siteType: "warehouse" }],
      }),
    );
    expect(bad.ok).toBe(true);
    if (bad.ok) {
      expect(bad.report.failed).toBe(1);
      expect(bad.report.rows[0].message).toMatch(/not found/);
    }
  });

  it("imports prices with the batch source id and chosen visibility", async () => {
    const result = await runImport(
      repo,
      baseInput({
        kind: "prices",
        rows: [
          {
            sku: "ACM-1058.0500", // catalogue number of sku-tsa-500
            amount: "1850000",
            currency: "VND",
            observationDate: "2026-07-01",
            geography: "VN",
            supplier: "Mekong Lab Supply (Demo)",
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.created).toBe(1);
    const price = await repo.getById("price_observation", result.report.createdEntityIds[0]);
    expect(price?.skuId).toBe("sku-tsa-500");
    expect(price?.supplierOrgId).toBe("org-mekong-lab-supply");
    expect(price?.sourceId).toBe(result.report.sourceRecordId);
    expect(price?.visibility).toBe("tenant_private");
    expect(price?.isSynthetic).toBe(false);
  });

  it("creates a person plus contact link for contacts rows", async () => {
    const result = await runImport(
      repo,
      baseInput({
        kind: "contacts",
        rows: [
          {
            fullName: "Test Contact Person",
            organization: "Delta Pharma Plant HCMC (Demo)",
            email: "test.contact@example.vn",
            isPrimary: "true",
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.created).toBe(1);
    const [personId, contactId] = result.report.rows[0].entityIds ?? [];
    const person = await repo.getById("person", personId);
    const contact = await repo.getById("organization_contact", contactId);
    expect(person?.fullName).toBe("Test Contact Person");
    expect(contact?.organizationId).toBe("org-delta-pharma-hcmc");
    expect(contact?.isPrimary).toBe(true);
  });

  it("aborts without writes when importValidOnly is false and errors exist", async () => {
    const before = (await repo.list("organization", { pageSize: 1000 })).total;
    const result = await runImport(
      repo,
      baseInput({
        importValidOnly: false,
        rows: [
          { name: "Valid Org", types: "distributor", country: "VN" },
          { name: "", types: "distributor", country: "VN" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    const after = (await repo.list("organization", { pageSize: 1000 })).total;
    expect(after).toBe(before);
  });

  it("honors duplicate-review skip rows", async () => {
    const result = await runImport(
      repo,
      baseInput({
        rows: [
          { name: "Skip Me Org", types: "dealer", country: "VN" },
          { name: "Keep Me Org", types: "dealer", country: "VN" },
        ],
        skipRowIndexes: [0],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.created).toBe(1);
    expect(result.report.rows[0].status).toBe("skipped");
    expect(result.report.rows[0].message).toMatch(/duplicate review/i);
  });
});

describe("findImportDuplicates", () => {
  it("scores SKU rows against existing catalogue numbers", async () => {
    const repo = createDemoRepository();
    const hits = await findImportDuplicates(repo, "skus", [
      { product: "prod-tsa-acme", name: "TSA 500 g bottle", catalogueNumber: "ACM-1058.0500" },
      { product: "prod-tsa-acme", name: "Completely Different Item ZZZ", catalogueNumber: "ZZZ-999" },
    ]);
    const rowZeroHits = hits.filter((hit) => hit.rowIndex === 0);
    expect(rowZeroHits.length).toBeGreaterThanOrEqual(1);
    expect(rowZeroHits[0].score).toBeGreaterThanOrEqual(0.45);
    expect(rowZeroHits.map((hit) => hit.candidateId)).toContain("sku-tsa-500");
    expect(rowZeroHits[0].matchedOn.length).toBeGreaterThan(0);
    // The unrelated row produces no candidates.
    expect(hits.filter((hit) => hit.rowIndex === 1)).toEqual([]);
  });

  it("scores organization rows against existing names (Vietnamese legal forms ignored)", async () => {
    const repo = createDemoRepository();
    const hits = await findImportDuplicates(repo, "organizations", [
      { name: "Công ty TNHH Mekong Lab Supply", types: "distributor", country: "VN" },
    ]);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].candidateId).toBe("org-mekong-lab-supply");
  });

  it("returns an empty list for kinds without a duplicate step", async () => {
    const repo = createDemoRepository();
    expect(await findImportDuplicates(repo, "prices", [])).toEqual([]);
  });
});
