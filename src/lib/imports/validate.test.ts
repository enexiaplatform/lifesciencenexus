import { describe, expect, it } from "vitest";

import { IMPORT_PRICE_CONFIDENCE, IMPORT_SOURCE_PLACEHOLDER, parseImportRow, validateRows } from "./validate";

describe("validateRows / parseImportRow", () => {
  it("accepts a valid organizations row (identifiers, types list, URL)", () => {
    const parsed = parseImportRow("organizations", {
      name: "Mekong Lab Supply Co., Ltd",
      types: "distributor;importer",
      country: "vn",
      website: "https://mekonglab.example.vn",
      identifiers: "tax_code:0312345678; domain:mekonglab.example.vn",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.dto.country).toBe("VN");
      expect(parsed.dto.types).toEqual(["distributor", "importer"]);
      expect(parsed.dto.identifiers).toEqual([
        { scheme: "tax_code", value: "0312345678" },
        { scheme: "domain", value: "mekonglab.example.vn" },
      ]);
    }
  });

  it("rejects rows with missing required fields and bad enums", () => {
    const summary = validateRows("organizations", [
      { name: "", types: "distributor", country: "VN" },
      { name: "Acme", types: "not-a-type", country: "VN" },
      { name: "Acme", types: "distributor", country: "VNM" },
      { name: "Acme", types: "distributor", country: "VN" },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.valid).toBe(1);
    expect(summary.invalid).toBe(3);
    expect(summary.rows[0].rowIndex).toBe(0);
    expect(summary.rows[0].errors.some((error) => error.path === "name")).toBe(true);
    expect(summary.rows[1].errors.some((error) => error.path.startsWith("types"))).toBe(true);
    expect(summary.rows[2].errors.some((error) => error.path === "country")).toBe(true);
  });

  it("coerces price cells (amount, Vietnamese boolean) and injects import defaults", () => {
    const parsed = parseImportRow("prices", {
      sku: "sku-tsa-500",
      amount: "1850000",
      currency: "vnd",
      observationDate: "2026-06-30",
      geography: "VN",
      taxIncluded: "có",
      vatRate: "0.1",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.dto.originalAmount).toBe(1850000);
      expect(parsed.dto.originalCurrency).toBe("VND");
      expect(parsed.dto.taxIncluded).toBe(true);
      expect(parsed.dto.vatRate).toBe(0.1);
      expect(parsed.dto.sourceId).toBe(IMPORT_SOURCE_PLACEHOLDER);
      expect(parsed.dto.confidence).toEqual(IMPORT_PRICE_CONFIDENCE);
      expect(parsed.dto.evidenceState).toBe("source_captured");
      expect(parsed.dto.isSynthetic).toBe(false);
    }
  });

  it("rejects a non-numeric price amount with a clear message", () => {
    const parsed = parseImportRow("prices", {
      sku: "sku-tsa-500",
      amount: "1.850.000đ",
      currency: "VND",
      observationDate: "2026-06-30",
      geography: "VN",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((error) => error.path === "amount")).toBe(true);
    }
  });

  it("rejects invalid dates", () => {
    const parsed = parseImportRow("tenders", {
      code: "T-1",
      title: "Test tender",
      buyer: "org-x",
      country: "VN",
      submissionDeadline: "15/04/2025",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((error) => error.path === "submissionDeadline")).toBe(true);
    }
  });

  it("assembles the contacts DTO (person + organization reference)", () => {
    const parsed = parseImportRow("contacts", {
      fullName: "Nguyen Van An",
      organization: "org-delta-pharma-hcmc",
      email: "an.nguyen@example.vn",
      decisionRoles: "user;technical_evaluator",
      isPrimary: "yes",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.dto.person).toMatchObject({ fullName: "Nguyen Van An", email: "an.nguyen@example.vn" });
      expect(parsed.dto.organizationId).toBe("org-delta-pharma-hcmc");
      expect(parsed.dto.decisionRoles).toEqual(["user", "technical_evaluator"]);
      expect(parsed.dto.isPrimary).toBe(true);
    }
  });

  it("rejects a bad email on contacts", () => {
    const parsed = parseImportRow("contacts", {
      fullName: "Nguyen Van An",
      organization: "org-x",
      email: "not-an-email",
    });
    expect(parsed.ok).toBe(false);
  });

  it("equivalence candidates: defaults reviewState, validates score range", () => {
    const good = parseImportRow("equivalence-candidates", {
      sourceSku: "sku-a",
      candidateSku: "sku-b",
      classification: "functional_equivalent",
      overallScore: "78",
      rationale: "Same formula.",
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.dto.overallScore).toBe(78);
      expect(good.dto.reviewState).toBe("unverified");
      expect(good.dto.dimensionScores).toEqual({});
    }
    const bad = parseImportRow("equivalence-candidates", {
      sourceSku: "sku-a",
      candidateSku: "sku-b",
      classification: "functional_equivalent",
      overallScore: "178",
      rationale: "Same formula.",
    });
    expect(bad.ok).toBe(false);
  });

  it("skus row: optional fields stay absent, gtin/catalogue kept", () => {
    const parsed = parseImportRow("skus", {
      product: "prod-tsa-acme",
      name: "TSA 500 g bottle",
      catalogueNumber: "ACM-1058.0500",
      shelfLifeMonths: "24",
      countryAvailability: "vn;th",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.dto.catalogueNumber).toBe("ACM-1058.0500");
      expect(parsed.dto.shelfLifeMonths).toBe(24);
      expect(parsed.dto.countryAvailability).toEqual(["VN", "TH"]);
      expect(parsed.dto.gtin).toBeUndefined();
    }
  });
});
