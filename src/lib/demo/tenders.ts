import type { Tender, TenderAward, TenderBidder, TenderEvent, TenderItem, TenderLot } from "@/lib/domain/types";

import { edgeEvidence, type SeedContext } from "./context";
import { ORGS, PRODUCTS, SITES, SKUS, SOURCES, TENDER, TENDER2, TENDER3 } from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Tender intelligence fixtures covering all three pipeline states: one
 * awarded hospital tender (contract end ~45 days out → tender_renewal_expected
 * always fires), one OPEN government food-safety tender (deadline ~30 days
 * out) and one CLOSED tender (deadline passed, evaluation underway) for
 * endotoxin reagents and biological indicators.
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
    {
      // Open tender: submission deadline ~30 days ahead, no award yet.
      ...ctx.canonical(TENDER2.tender),
      code: "NFS-2026-007",
      title: "Supply of chromogenic culture media for food pathogen testing (Demo)",
      buyerOrganizationId: ORGS.nfsCenter,
      siteId: SITES.nfsSite,
      publicationDate: ctx.daysAgo(15),
      submissionDeadline: ctx.daysAhead(30),
      country: "VN",
      status: "published",
      sourceId: SOURCES.nfsTenderDoc,
    },
    {
      // Closed tender: deadline passed 10 days ago, evaluation underway — the
      // third pipeline state alongside awarded (RRH-2025-014) and open (NFS).
      ...ctx.canonical(TENDER3.tender),
      code: "RRH-2026-003",
      title: "Supply of endotoxin testing reagents and biological indicators (Demo)",
      buyerOrganizationId: ORGS.redRiverHospital,
      siteId: SITES.redRiverMain,
      publicationDate: ctx.daysAgo(55),
      submissionDeadline: ctx.daysAgo(10),
      country: "VN",
      status: "closed",
      sourceId: SOURCES.rrh3TenderDoc,
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
    {
      ...ctx.canonical(TENDER2.lotMedia),
      tenderId: TENDER2.tender,
      name: "Lot 1 — Chromogenic culture media (Demo)",
      description: "12-month supply of chromogenic media for Salmonella/Listeria testing (Demo).",
    },
    {
      ...ctx.canonical(TENDER3.lotEndo),
      tenderId: TENDER3.tender,
      name: "Lot 1 — Endotoxin assays and biological indicators (Demo)",
      description: "12-month supply of BET reagents and steam-cycle BIs (Demo).",
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
    {
      ...ctx.canonical(TENDER2.itemCc),
      lotId: TENDER2.lotMedia,
      description: "Chromogenic coliform agar dehydrated medium, 500 g bottles (Demo)",
      requiredSpecification: "Chromogenic detection of coliforms / E. coli (Demo)",
      quantity: 120,
      unit: "bottle",
      mappedProductId: PRODUCTS.ccAurora,
      mappedSkuId: SKUS.cc500,
    },
    {
      ...ctx.canonical(TENDER2.itemCcp),
      lotId: TENDER2.lotMedia,
      description: "Chromogenic Listeria ready plates 90 mm, packs of 20 (Demo)",
      requiredSpecification: "Listeria monocytogenes detection per ISO 11290-1 (Demo)",
      quantity: 300,
      unit: "pack",
      mappedProductId: PRODUCTS.ccPlatesAurora,
      mappedSkuId: SKUS.ccPlates20,
    },
    {
      ...ctx.canonical(TENDER3.itemEndoZyme),
      lotId: TENDER3.lotEndo,
      description: "Recombinant Factor C endotoxin assay kits (Demo)",
      requiredSpecification: "Kinetic fluorescent rFC assay per USP <85> (Demo)",
      quantity: 40,
      unit: "kit",
      mappedProductId: PRODUCTS.endoZymeOrizon,
      mappedSkuId: SKUS.endoZyme192,
    },
    {
      ...ctx.canonical(TENDER3.itemLal),
      lotId: TENDER3.lotEndo,
      description: "LAL gel-clot cartridges (Demo)",
      requiredSpecification: "Gel-clot LAL per USP <85> (Demo)",
      quantity: 120,
      unit: "kit",
      mappedProductId: PRODUCTS.lalDelta,
      mappedSkuId: SKUS.lalCart50,
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
    {
      ...ctx.canonical(TENDER3.bidHongHa),
      lotId: TENDER3.lotEndo,
      organizationId: ORGS.hongHa,
      bidAmount: 1_260_000_000,
      currency: "VND",
    },
    {
      ...ctx.canonical(TENDER3.bidSaigon),
      lotId: TENDER3.lotEndo,
      organizationId: ORGS.saigon,
      bidAmount: 1_190_000_000,
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
    {
      ...ctx.canonical(TENDER2.evPublished),
      tenderId: TENDER2.tender,
      type: "published",
      at: ctx.daysAgo(15),
      description: "Tender dossier published (Demo).",
    },
    {
      ...ctx.canonical(TENDER2.evClarification),
      tenderId: TENDER2.tender,
      type: "clarification",
      at: ctx.daysAgo(5),
      description: "Clarification on plate shelf-life requirements issued (Demo).",
    },
    {
      ...ctx.canonical(TENDER3.evPublished),
      tenderId: TENDER3.tender,
      type: "published",
      at: ctx.daysAgo(55),
      description: "Tender dossier published (Demo).",
    },
    {
      ...ctx.canonical(TENDER3.evExtended),
      tenderId: TENDER3.tender,
      type: "deadline_extended",
      at: ctx.daysAgo(25),
      description: "Submission deadline extended by 10 days (Demo).",
    },
    {
      ...ctx.canonical(TENDER3.evClosed),
      tenderId: TENDER3.tender,
      type: "closed",
      at: ctx.daysAgo(10),
      description: "Submission closed; evaluation in progress (Demo).",
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
