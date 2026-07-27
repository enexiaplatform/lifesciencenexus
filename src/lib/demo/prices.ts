import { normalizePrice } from "@/lib/domain/price-normalization";
import type {
  AvailabilityObservation,
  CommercialTerms,
  DistributionAgreement,
  PackConfiguration,
  PriceComponent,
  PriceObservation,
  SupplierListing,
  SupplierProfile,
} from "@/lib/domain/types";

import { confidence, edgeEvidence, type SeedContext } from "./context";
import {
  AGREEMENTS,
  AVAILABILITY,
  COMMERCIAL_TERMS,
  DEMO_TENANT_ID,
  LISTINGS,
  ORGS,
  PACKS,
  PRICE_COMPONENTS,
  PRICES,
  SKUS,
  SOURCES,
  SUPPLIER_PROFILES,
} from "./ids";
import type { DemoDatasetSlices } from "./types";

/** Tests obtainable per base unit of pack content, by SKU (feeds per-test normalization). */
const YIELD_PER_UNIT: Partial<Record<string, number>> = {
  [SKUS.tsa500]: 1.25, // 500 g bottle → ~625 poured plates
  [SKUS.tsaDelta500]: 1.25,
  [SKUS.tsaPlates20]: 1, // 1 test per ready plate
  [SKUS.sdaPlates20]: 1,
  [SKUS.emContact20]: 1,
};

/**
 * Commercial overlay fixtures: supplier profiles, distribution agreements
 * (one expired, one expiring soon), supplier listings, availability
 * observations (including a repeated stock issue), and price observations in
 * VND + USD with tax/incoterm variety and deliberate staleness.
 *
 * Price governance: every observation is synthetic (`isSynthetic: true`),
 * sourced from a Demo quotation / internal note / import extract, and never
 * reviewed above `source_captured`.
 */
export function seedPrices(ctx: SeedContext, packConfigurations: PackConfiguration[]): DemoDatasetSlices {
  const supplierProfiles: SupplierProfile[] = [
    {
      ...ctx.canonical(SUPPLIER_PROFILES.mekong),
      organizationId: ORGS.mekong,
      relationshipType: "authorized_distributor",
      manufacturers: [ORGS.acme, ORGS.condor],
      countries: ["VN"],
    },
    {
      ...ctx.canonical(SUPPLIER_PROFILES.mekongDup),
      organizationId: ORGS.mekongDup,
      relationshipType: "unknown_unverified",
      manufacturers: [],
      countries: ["VN"],
    },
    {
      ...ctx.canonical(SUPPLIER_PROFILES.saigon),
      organizationId: ORGS.saigon,
      relationshipType: "non_exclusive_distributor",
      manufacturers: [ORGS.deltaBio],
      countries: ["VN"],
    },
  ];

  const distributionAgreements: DistributionAgreement[] = [
    {
      // Expired ~45 days ago → supplier_agreement_expired signal.
      ...ctx.canonical(AGREEMENTS.acmeMekong),
      manufacturerOrgId: ORGS.acme,
      distributorOrgId: ORGS.mekong,
      relationshipType: "authorized_distributor",
      countries: ["VN"],
      validFrom: ctx.daysAgo(400),
      validTo: ctx.daysAgo(45),
      evidence: edgeEvidence(SOURCES.acmeCatalogue, "source_captured", 0.85),
    },
    {
      // Expires in ~60 days → counted by dashboard freshness.
      ...ctx.canonical(AGREEMENTS.deltaSaigon),
      manufacturerOrgId: ORGS.deltaBio,
      distributorOrgId: ORGS.saigon,
      relationshipType: "non_exclusive_distributor",
      countries: ["VN"],
      validFrom: ctx.daysAgo(300),
      validTo: ctx.daysAhead(60),
      evidence: edgeEvidence(SOURCES.deltaCatalogue, "source_captured", 0.8),
    },
  ];

  const supplierListings: SupplierListing[] = [
    { ...ctx.canonical(LISTINGS.mekongTsa), supplierOrgId: ORGS.mekong, skuId: SKUS.tsa500, relationshipType: "authorized_distributor", evidence: edgeEvidence(SOURCES.mekongQuote, "source_captured", 0.85) },
    { ...ctx.canonical(LISTINGS.mekongTp), supplierOrgId: ORGS.mekong, skuId: SKUS.tsaPlates20, relationshipType: "authorized_distributor", evidence: edgeEvidence(SOURCES.mekongQuote, "source_captured", 0.85) },
    { ...ctx.canonical(LISTINGS.mekongNb), supplierOrgId: ORGS.mekong, skuId: SKUS.nb500, relationshipType: "authorized_distributor", evidence: edgeEvidence(SOURCES.mekongQuote, "source_captured", 0.8) },
    { ...ctx.canonical(LISTINGS.mekongAir), supplierOrgId: ORGS.mekong, skuId: SKUS.airAs100, relationshipType: "authorized_distributor", evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical(LISTINGS.mekongEm), supplierOrgId: ORGS.mekong, skuId: SKUS.emContact20, relationshipType: "authorized_distributor", evidence: edgeEvidence(SOURCES.mekongQuote, "source_captured", 0.8) },
    { ...ctx.canonical(LISTINGS.mekongPc), supplierOrgId: ORGS.mekong, skuId: SKUS.pc50, relationshipType: "authorized_distributor", evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical(LISTINGS.saigonTd), supplierOrgId: ORGS.saigon, skuId: SKUS.tsaDelta500, relationshipType: "non_exclusive_distributor", evidence: edgeEvidence(SOURCES.saigonQuote, "source_captured", 0.8) },
    { ...ctx.canonical(LISTINGS.saigonSda), supplierOrgId: ORGS.saigon, skuId: SKUS.sdaPlates20, relationshipType: "non_exclusive_distributor", evidence: edgeEvidence(SOURCES.saigonQuote, "source_captured", 0.75) },
    { ...ctx.canonical(LISTINGS.saigonQc), supplierOrgId: ORGS.saigon, skuId: SKUS.qcBsub10, relationshipType: "non_exclusive_distributor", evidence: edgeEvidence(SOURCES.saigonQuote, "source_captured", 0.8) },
    { ...ctx.canonical(LISTINGS.saigonNa2), supplierOrgId: ORGS.saigon, skuId: SKUS.na2x500, relationshipType: "non_exclusive_distributor", evidence: edgeEvidence(SOURCES.deltaCatalogue, "source_captured", 0.75) },
    // Listed but with NO price and NO availability → incomplete_product_coverage signal.
    { ...ctx.canonical(LISTINGS.saigonSteri), supplierOrgId: ORGS.saigon, skuId: SKUS.steriCan10, relationshipType: "non_exclusive_distributor", evidence: edgeEvidence(SOURCES.condorCatalogue, "unverified", 0.5) },
  ];

  const availabilityObservations: AvailabilityObservation[] = [
    { ...ctx.canonical(AVAILABILITY.tsaInStock), supplierOrgId: ORGS.mekong, skuId: SKUS.tsa500, country: "VN", observedAt: ctx.daysAgo(15), status: "in_stock", leadTimeDays: 7 },
    // Two stock issues for the same SKU + supplier inside 90 days → repeated_stock_issue.
    { ...ctx.canonical(AVAILABILITY.tpLimited), supplierOrgId: ORGS.mekong, skuId: SKUS.tsaPlates20, country: "VN", observedAt: ctx.daysAgo(30), status: "limited", leadTimeDays: 21 },
    { ...ctx.canonical(AVAILABILITY.tpOutOfStock), supplierOrgId: ORGS.mekong, skuId: SKUS.tsaPlates20, country: "VN", observedAt: ctx.daysAgo(10), status: "out_of_stock", leadTimeDays: 28 },
    { ...ctx.canonical(AVAILABILITY.sdaOutOfStock), supplierOrgId: ORGS.saigon, skuId: SKUS.sdaPlates20, country: "VN", observedAt: ctx.daysAgo(60), status: "out_of_stock", leadTimeDays: 35 },
    { ...ctx.canonical(AVAILABILITY.airInStock), supplierOrgId: ORGS.mekong, skuId: SKUS.airAs100, country: "VN", observedAt: ctx.daysAgo(20), status: "in_stock", leadTimeDays: 14 },
    { ...ctx.canonical(AVAILABILITY.emInStock), supplierOrgId: ORGS.mekong, skuId: SKUS.emContact20, country: "VN", observedAt: ctx.daysAgo(12), status: "in_stock", leadTimeDays: 10 },
    { ...ctx.canonical(AVAILABILITY.pcInStock), supplierOrgId: ORGS.mekong, skuId: SKUS.pc50, country: "VN", observedAt: ctx.daysAgo(25), status: "in_stock", leadTimeDays: 30 },
    { ...ctx.canonical(AVAILABILITY.na2InStock), supplierOrgId: ORGS.saigon, skuId: SKUS.na2x500, country: "VN", observedAt: ctx.daysAgo(40), status: "in_stock", leadTimeDays: 12 },
  ];

  const commercialTerms: CommercialTerms[] = [
    {
      ...ctx.tenantPrivate(COMMERCIAL_TERMS.mekong, DEMO_TENANT_ID),
      supplierOrgId: ORGS.mekong,
      moq: 5,
      moqUnit: "pack",
      paymentTerms: "Net 30",
      incoterm: "DAP",
      currency: "VND",
      validFrom: ctx.daysAgo(200),
      validTo: ctx.daysAhead(165),
      notes: "Framework terms negotiated 2026 cycle (Demo).",
    },
  ];

  const rawPrices: PriceObservation[] = [
    {
      // 400 days old, superseded in practice by price-tsa-new (+23.9 % → unusual_price_increase).
      ...ctx.canonical(PRICES.tsaOld),
      skuId: SKUS.tsa500,
      packConfigurationId: PACKS.tsa500,
      supplierOrgId: ORGS.mekong,
      originalAmount: 2_300_000,
      originalCurrency: "VND",
      observationDate: ctx.daysAgo(400),
      taxIncluded: false,
      vatRate: 0.1,
      incoterm: "DAP",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.mekongQuoteOld,
      confidence: confidence(0.7),
      evidenceState: "source_captured",
      isSynthetic: true,
    },
    {
      ...ctx.canonical(PRICES.tsaNew),
      skuId: SKUS.tsa500,
      packConfigurationId: PACKS.tsa500,
      supplierOrgId: ORGS.mekong,
      originalAmount: 2_850_000,
      originalCurrency: "VND",
      observationDate: ctx.daysAgo(20),
      taxIncluded: false,
      vatRate: 0.1,
      incoterm: "DAP",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.mekongQuote,
      confidence: confidence(0.8),
      evidenceState: "source_captured",
      isSynthetic: true,
    },
    {
      ...ctx.canonical(PRICES.tp),
      skuId: SKUS.tsaPlates20,
      packConfigurationId: PACKS.tsaPlates20,
      supplierOrgId: ORGS.mekong,
      originalAmount: 1_150_000,
      originalCurrency: "VND",
      observationDate: ctx.daysAgo(18),
      taxIncluded: true,
      vatRate: 0.1,
      incoterm: "DAP",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.mekongQuote,
      confidence: confidence(0.8),
      evidenceState: "source_captured",
      isSynthetic: true,
    },
    {
      ...ctx.canonical(PRICES.nb),
      skuId: SKUS.nb500,
      packConfigurationId: PACKS.nb500,
      supplierOrgId: ORGS.mekong,
      originalAmount: 1_650_000,
      originalCurrency: "VND",
      observationDate: ctx.daysAgo(90),
      taxIncluded: false,
      vatRate: 0.1,
      incoterm: "EXW",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.mekongQuote,
      confidence: confidence(0.6),
      evidenceState: "unverified",
      isSynthetic: true,
    },
    {
      // Tenant-private quoted price (USD, EXW).
      ...ctx.canonical(PRICES.tdNew),
      visibility: "tenant_private",
      skuId: SKUS.tsaDelta500,
      packConfigurationId: PACKS.tsaDelta500,
      supplierOrgId: ORGS.saigon,
      originalAmount: 98,
      originalCurrency: "USD",
      observationDate: ctx.daysAgo(30),
      taxIncluded: false,
      incoterm: "EXW",
      geography: "VN",
      customerSegment: "pharma_qc",
      quantity: 1,
      sourceId: SOURCES.saigonQuote,
      confidence: confidence(0.75),
      evidenceState: "source_captured",
      isSynthetic: true,
    },
    {
      ...ctx.canonical(PRICES.tdOld),
      visibility: "tenant_private",
      skuId: SKUS.tsaDelta500,
      packConfigurationId: PACKS.tsaDelta500,
      supplierOrgId: ORGS.saigon,
      originalAmount: 96,
      originalCurrency: "USD",
      observationDate: ctx.daysAgo(200),
      taxIncluded: false,
      incoterm: "EXW",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.saigonQuote,
      confidence: confidence(0.6),
      evidenceState: "unverified",
      isSynthetic: true,
    },
    {
      // Stale (>180 days): latest observation for this SKU → price_stale signal.
      ...ctx.canonical(PRICES.sdaStale),
      skuId: SKUS.sdaPlates20,
      packConfigurationId: PACKS.sda20,
      supplierOrgId: ORGS.saigon,
      originalAmount: 980_000,
      originalCurrency: "VND",
      observationDate: ctx.daysAgo(200),
      taxIncluded: true,
      vatRate: 0.08,
      incoterm: "CIF",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.importRecord,
      confidence: confidence(0.5),
      evidenceState: "source_captured",
      isSynthetic: true,
    },
    {
      ...ctx.canonical(PRICES.qc),
      visibility: "tenant_private",
      skuId: SKUS.qcBsub10,
      packConfigurationId: PACKS.qcBsub10,
      supplierOrgId: ORGS.saigon,
      originalAmount: 145,
      originalCurrency: "USD",
      observationDate: ctx.daysAgo(45),
      taxIncluded: false,
      incoterm: "CIF",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.saigonQuote,
      confidence: confidence(0.75),
      evidenceState: "source_captured",
      isSynthetic: true,
    },
    {
      ...ctx.canonical(PRICES.em),
      skuId: SKUS.emContact20,
      packConfigurationId: PACKS.emContact20,
      supplierOrgId: ORGS.mekong,
      originalAmount: 720_000,
      originalCurrency: "VND",
      observationDate: ctx.daysAgo(15),
      taxIncluded: false,
      vatRate: 0.1,
      incoterm: "DAP",
      geography: "VN",
      quantity: 1,
      sourceId: SOURCES.internalNote,
      confidence: confidence(0.55),
      evidenceState: "unverified",
      isSynthetic: true,
    },
  ];

  // Fill normalized per-unit / per-test fields with the domain engine so the
  // seeded values are exactly what normalization would compute (never guessed).
  const priceObservations = rawPrices.map((observation) => {
    const pack = observation.packConfigurationId
      ? packConfigurations.find((candidate) => candidate.id === observation.packConfigurationId) ?? null
      : null;
    return normalizePrice(observation, pack, { yieldPerUnit: YIELD_PER_UNIT[observation.skuId] }).observation;
  });

  const priceComponents: PriceComponent[] = [
    {
      ...ctx.canonical(PRICE_COMPONENTS.qcFreight),
      priceObservationId: PRICES.qc,
      kind: "freight",
      amount: 12,
      currency: "USD",
    },
    {
      ...ctx.canonical(PRICE_COMPONENTS.sdaDuty),
      priceObservationId: PRICES.sdaStale,
      kind: "import_duty",
      amount: 45_000,
      currency: "VND",
    },
  ];

  return {
    supplier_profile: supplierProfiles,
    distribution_agreement: distributionAgreements,
    supplier_listing: supplierListings,
    availability_observation: availabilityObservations,
    commercial_terms: commercialTerms,
    price_observation: priceObservations,
    price_component: priceComponents,
  };
}
