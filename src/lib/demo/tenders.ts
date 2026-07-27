import type { Tender, TenderAward, TenderBidder, TenderEvent, TenderItem, TenderLot } from "@/lib/domain/types";

import { edgeEvidence, type SeedContext } from "./context";
import { ORGS, PRODUCTS, SITES, SKUS, SOURCES, TENDER } from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Tender intelligence fixture: one awarded hospital tender with two lots,
 * three items mapped to demo SKUs, two bidders and one award. The award date
 * and 12-month contract period place the contract end ~45 days out, so the
 * tender_renewal_expected signal always fires.
 */
export function seedTenders(ctx: SeedContext): DemoDatasetSlices {
  const tenders: Tender[] = [
    {
      ...ctx.canonical(TENDER.tender),
      code: "RRH-2025-014",
      title: "Supply of microbiology culture media and QC organisms (Demo)",
      buyerOrganizationId: ORGS.redRiverHospital,
      siteId: SITES.redRiverMain,
      publicationDate: ctx.daysAgo(380),
      submissionDeadline: ctx.daysAgo(340),
      awardDate: ctx.daysAgo(320),
      contractPeriodMonths: 12,
      country: "VN",
      status: "awarded",
      sourceId: SOURCES.tenderDoc,
    },
  ];

  const tenderLots: TenderLot[] = [
    {
      ...ctx.canonical(TENDER.lotMedia),
      tenderId: TENDER.tender,
      name: "Lot 1 — Dehydrated and ready-prepared culture media (Demo)",
      description: "12-month framework supply of culture media (Demo).",
    },
    {
      ...ctx.canonical(TENDER.lotQc),
      tenderId: TENDER.tender,
      name: "Lot 2 — Microbial reference materials (Demo)",
      description: "QC organisms for growth promotion testing (Demo).",
    },
  ];

  const tenderItems: TenderItem[] = [
    {
      ...ctx.canonical(TENDER.itemTsa),
      lotId: TENDER.lotMedia,
      description: "Tryptic Soy Agar dehydrated medium, 500 g bottles (Demo)",
      requiredSpecification: "Growth promotion per ISO 11133 (Demo)",
      quantity: 200,
      unit: "bottle",
      mappedProductId: PRODUCTS.tsaAcme,
      mappedSkuId: SKUS.tsa500,
    },
    {
      ...ctx.canonical(TENDER.itemTsaPlates),
      lotId: TENDER.lotMedia,
      description: "TSA ready plates 90 mm, packs of 20 (Demo)",
      requiredSpecification: "Ready-to-use, 2-8 °C storage (Demo)",
      quantity: 500,
      unit: "pack",
      mappedProductId: PRODUCTS.tsaPlatesAcme,
      mappedSkuId: SKUS.tsaPlates20,
    },
    {
      ...ctx.canonical(TENDER.itemQc),
      lotId: TENDER.lotQc,
      description: "Bacillus subtilis ATCC 6633 QC pellets (Demo)",
      requiredSpecification: "Certified reference strain, ≤4 passages (Demo)",
      quantity: 50,
      unit: "pack",
      mappedProductId: PRODUCTS.qcDelta,
      mappedSkuId: SKUS.qcBsub10,
    },
  ];

  const tenderBidders: TenderBidder[] = [
    {
      ...ctx.canonical(TENDER.bidMekong),
      lotId: TENDER.lotMedia,
      organizationId: ORGS.mekong,
      bidAmount: 1_900_000_000,
      currency: "VND",
    },
    {
      ...ctx.canonical(TENDER.bidSaigon),
      lotId: TENDER.lotQc,
      organizationId: ORGS.saigon,
      bidAmount: 420_000_000,
      currency: "VND",
    },
  ];

  const tenderAwards: TenderAward[] = [
    {
      ...ctx.canonical(TENDER.awardMedia),
      lotId: TENDER.lotMedia,
      awardedSupplierOrgId: ORGS.mekong,
      awardedManufacturerOrgId: ORGS.acme,
      awardedProductId: PRODUCTS.tsaAcme,
      amount: 1_850_000_000,
      currency: "VND",
      awardDate: ctx.daysAgo(320),
      evidence: edgeEvidence(SOURCES.tenderDoc, "source_captured", 0.9),
    },
  ];

  const tenderEvents: TenderEvent[] = [
    {
      ...ctx.canonical(TENDER.evPublished),
      tenderId: TENDER.tender,
      type: "published",
      at: ctx.daysAgo(380),
      description: "Tender dossier published (Demo).",
    },
    {
      ...ctx.canonical(TENDER.evClarification),
      tenderId: TENDER.tender,
      type: "clarification",
      at: ctx.daysAgo(355),
      description: "Clarification on plate pack sizes issued (Demo).",
    },
    {
      ...ctx.canonical(TENDER.evClosed),
      tenderId: TENDER.tender,
      type: "closed",
      at: ctx.daysAgo(340),
      description: "Submission deadline passed (Demo).",
    },
    {
      ...ctx.canonical(TENDER.evAwarded),
      tenderId: TENDER.tender,
      type: "awarded",
      at: ctx.daysAgo(320),
      description: "Lot 1 awarded to Mekong Lab Supply (Demo).",
    },
  ];

  return {
    tender: tenders,
    tender_lot: tenderLots,
    tender_item: tenderItems,
    tender_bidder: tenderBidders,
    tender_award: tenderAwards,
    tender_event: tenderEvents,
  };
}
