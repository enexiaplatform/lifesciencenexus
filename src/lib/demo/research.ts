import type {
  CostPerTestScenario,
  EquivalenceRecord,
  ResearchExport,
  ResearchFinding,
  ResearchNote,
  ResearchProject,
  ResearchProjectEntity,
  SavedView,
} from "@/lib/domain/types";

import type { SeedContext } from "./context";
import {
  CLAIMS,
  COST_SCENARIOS,
  DEMO_TENANT_ID,
  EQUIVALENCES,
  ORGS,
  OTHER_TENANT_ID,
  PRICES,
  PRODUCTS,
  RESEARCH,
  SKUS,
  TENDER,
  USERS,
} from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Research workspace fixtures: the "Vietnam ready-prepared media market"
 * project with notes, findings of every epistemic kind, entity links, a saved
 * view and an export — plus two cost-per-test scenarios (dehydrated 500 g
 * bottle vs ready plate pack) and two SKU equivalence records (a ~78
 * functional_equivalent and a ~60 closest_alternative).
 */
export function seedResearch(ctx: SeedContext): DemoDatasetSlices {
  const researchProjects: ResearchProject[] = [
    {
      ...ctx.tenantPrivate(RESEARCH.project, DEMO_TENANT_ID),
      title: "Vietnam ready-prepared media market (Demo)",
      question:
        "How large is the addressable ready-prepared media market for pharma QC labs in Vietnam, and which suppliers cover it?",
      scope: "Pharma and food QC laboratories, Vietnam, 2025-2026 (Demo).",
      geographyCodes: ["VN"],
      industryCodes: ["pharma", "food_beverage"],
      status: "active",
    },
    {
      // Belongs to tenant_other: must be invisible from the demo tenant.
      ...ctx.tenantPrivate(RESEARCH.otherProject, OTHER_TENANT_ID),
      title: "Competitor watch (Other Tenant Demo)",
      question: "Which demo SKUs compete in the other tenant's patch?",
      geographyCodes: ["VN"],
      industryCodes: ["pharma"],
      status: "active",
    },
    {
      ...ctx.tenantPrivate(RESEARCH.dairyProject, DEMO_TENANT_ID),
      title: "Dairy pathogen monitoring — Hue (Demo)",
      question: "Which chromogenic media fit the Song Huong Dairy Listeria/coliform monitoring program?",
      scope: "Dairy QC laboratories, central Vietnam, 2026 (Demo).",
      geographyCodes: ["VN"],
      industryCodes: ["food_beverage"],
      status: "active",
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabProject, DEMO_TENANT_ID),
      title: "mAb downstream consumables — Vietnam (Demo)",
      question: "What does a single-use downstream train (Protein A capture → polishing → sterile filtration → BET release) cost per batch for a Vietnamese mAb producer?",
      scope: "Biopharma producers and CDMOs, Vietnam, 2026 (Demo).",
      geographyCodes: ["VN"],
      industryCodes: ["pharma"],
      status: "active",
    },
  ];

  const researchNotes: ResearchNote[] = [
    {
      ...ctx.tenantPrivate(RESEARCH.notePlates, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      text: "Distributor conversations suggest small QC labs are shifting from dehydrated media to ready plates (Demo note).",
      entityType: "product",
      entityId: PRODUCTS.tsaPlatesAcme,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.noteTender, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      text: "Hospital tenders bundle dehydrated media with QC organisms — see RRH-2025-014 (Demo note).",
      entityType: "tender",
      entityId: TENDER.tender,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.dairyNote, DEMO_TENANT_ID),
      projectId: RESEARCH.dairyProject,
      text: "QC supervisor wants to consolidate coliform and Listeria screening on one chromogenic supplier (Demo note).",
      entityType: "organization",
      entityId: ORGS.songHuong,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabNote, DEMO_TENANT_ID),
      projectId: RESEARCH.mabProject,
      text: "Protein A resin dominates downstream COGS — landed VN price per litre varies widely by channel (Demo note).",
      entityType: "product",
      entityId: PRODUCTS.proaAuriga,
    },
  ];

  const researchFindings: ResearchFinding[] = [
    {
      ...ctx.tenantPrivate(RESEARCH.findingFact, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      kind: "verified_fact",
      text: "TSA ready plates are listed by a demo distributor in Vietnam with a captured quotation (Demo finding).",
      evidenceClaimIds: [CLAIMS.tpDistributed],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.findingInterpretation, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      kind: "analyst_interpretation",
      text: "Ready-prepared formats likely win share in low-throughput labs despite a higher cost per test (Demo interpretation).",
      evidenceClaimIds: [],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.findingAssumption, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      kind: "assumption",
      text: "Assume imported ready plates carry a ~10 % landed-cost uplift over list price (Demo assumption).",
      evidenceClaimIds: [],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.findingUnknown, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      kind: "unknown",
      text: "Actual consumption volumes of ready plates at hospital laboratories are unknown (Demo gap).",
      evidenceClaimIds: [],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.findingRecommendation, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      kind: "recommendation",
      text: "Capture fresh distributor quotations for ready plates before the RRH renewal tender (Demo recommendation).",
      evidenceClaimIds: [],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.dairyFinding, DEMO_TENANT_ID),
      projectId: RESEARCH.dairyProject,
      kind: "verified_fact",
      text: "AuroraChrom coliform agar is distributed in Vietnam by a demo distributor with a captured quotation (Demo finding).",
      evidenceClaimIds: [CLAIMS.ccDistributed],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabFinding, DEMO_TENANT_ID),
      projectId: RESEARCH.mabProject,
      kind: "verified_fact",
      text: "Both an animal-free rFC assay and a compendial LAL gel-clot option are distributed in Vietnam with captured quotations (Demo finding).",
      evidenceClaimIds: [CLAIMS.endoZymeDistributed, CLAIMS.lalDistributed],
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabFindingUnknown, DEMO_TENANT_ID),
      projectId: RESEARCH.mabProject,
      kind: "unknown",
      text: "Actual Protein A resin cycle life under Vietnamese feedstock conditions is unknown — cost-per-cycle cannot be finalized (Demo gap).",
      evidenceClaimIds: [],
    },
  ];

  const researchProjectEntities: ResearchProjectEntity[] = [
    {
      ...ctx.tenantPrivate(RESEARCH.linkProduct, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      entityType: "product",
      entityId: PRODUCTS.tsaPlatesAcme,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.linkSku, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      entityType: "sku",
      entityId: SKUS.tsaPlates20,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.linkOrg, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      entityType: "organization",
      entityId: ORGS.mekong,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.linkTender, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      entityType: "tender",
      entityId: TENDER.tender,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.dairyLinkOrg, DEMO_TENANT_ID),
      projectId: RESEARCH.dairyProject,
      entityType: "organization",
      entityId: ORGS.songHuong,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.dairyLinkProduct, DEMO_TENANT_ID),
      projectId: RESEARCH.dairyProject,
      entityType: "product",
      entityId: PRODUCTS.ccPlatesAurora,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabLinkProa, DEMO_TENANT_ID),
      projectId: RESEARCH.mabProject,
      entityType: "product",
      entityId: PRODUCTS.proaAuriga,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabLinkSteriFlow, DEMO_TENANT_ID),
      projectId: RESEARCH.mabProject,
      entityType: "product",
      entityId: PRODUCTS.steriFlowKestrel,
    },
    {
      ...ctx.tenantPrivate(RESEARCH.mabLinkLal, DEMO_TENANT_ID),
      projectId: RESEARCH.mabProject,
      entityType: "product",
      entityId: PRODUCTS.lalDelta,
    },
  ];

  const savedViews: SavedView[] = [
    {
      ...ctx.tenantPrivate(RESEARCH.savedView, DEMO_TENANT_ID),
      name: "Ready media SKUs — VN (Demo)",
      entityType: "sku",
      params: {
        filters: { countryAvailability: "VN" },
        sort: { field: "name", direction: "asc" },
        columns: ["name", "catalogueNumber", "status"],
      },
      ownerId: USERS.demoAnalyst,
    },
  ];

  const researchExports: ResearchExport[] = [
    {
      ...ctx.tenantPrivate(RESEARCH.exportPdf, DEMO_TENANT_ID),
      projectId: RESEARCH.project,
      format: "pdf",
      fileName: "ready-media-vn-demo.pdf",
    },
  ];

  const costPerTestScenarios: CostPerTestScenario[] = [
    {
      ...ctx.tenantPrivate(COST_SCENARIOS.tsaDehydrated, DEMO_TENANT_ID),
      name: "TSA dehydrated 500 g — cost per plate (Demo)",
      skuId: SKUS.tsa500,
      priceObservationId: PRICES.tsaNew,
      input: {
        purchasePrice: 2_850_000,
        currency: "VND",
        packQuantity: 500,
        packUnit: "g",
        yieldPerUnit: 1.25,
        freight: 120_000,
        importDutyRate: 0.05,
        vatRate: 0.1,
        taxIncluded: false,
        preparationMaterials: 3_000,
        water: 500,
        laborMinutesPerTest: 6,
        laborRatePerHour: 60_000,
        equipmentAllocationPerTest: 800,
        qcGptPerTest: 1_200,
        sterilizationPerTest: 900,
        wasteRate: 0.05,
        failureRepeatRate: 0.02,
        disposalPerTest: 400,
        validationCostAmortized: 1_500,
      },
      notes: "Full in-house preparation cost stack (Demo).",
    },
    {
      ...ctx.tenantPrivate(COST_SCENARIOS.tsaPlates, DEMO_TENANT_ID),
      name: "TSA ready plates 20/pack — cost per test (Demo)",
      skuId: SKUS.tsaPlates20,
      priceObservationId: PRICES.tp,
      input: {
        purchasePrice: 1_150_000,
        currency: "VND",
        packQuantity: 20,
        packUnit: "plate",
        yieldPerUnit: 1,
        vatRate: 0.1,
        taxIncluded: true,
        laborMinutesPerTest: 1,
        laborRatePerHour: 60_000,
        wasteRate: 0.02,
        disposalPerTest: 400,
      },
      notes: "Ready-to-use: minimal preparation labor (Demo).",
    },
    {
      // BET comparison: compendial gel-clot vs animal-free rFC — the assay
      // choice in cost-per-test terms (cf. equivalence record equiv-rfc-vs-lal).
      ...ctx.tenantPrivate(COST_SCENARIOS.betLal, DEMO_TENANT_ID),
      name: "BET gel-clot LAL — cost per test (Demo)",
      skuId: SKUS.lalCart50,
      priceObservationId: PRICES.lal,
      input: {
        purchasePrice: 9_800_000,
        currency: "VND",
        packQuantity: 50,
        packUnit: "test",
        yieldPerUnit: 1,
        vatRate: 0.1,
        taxIncluded: false,
        laborMinutesPerTest: 20,
        laborRatePerHour: 60_000,
        water: 300,
        wasteRate: 0.05,
        failureRepeatRate: 0.05,
        disposalPerTest: 500,
        validationCostAmortized: 800,
      },
      notes: "Visual readout; higher hands-on time per test (Demo).",
    },
    {
      ...ctx.tenantPrivate(COST_SCENARIOS.betRfc, DEMO_TENANT_ID),
      name: "BET rFC kinetic — cost per test (Demo)",
      skuId: SKUS.endoZyme192,
      priceObservationId: PRICES.endoZyme,
      input: {
        purchasePrice: 28_500_000,
        currency: "VND",
        packQuantity: 192,
        packUnit: "test",
        yieldPerUnit: 1,
        vatRate: 0.1,
        taxIncluded: true,
        laborMinutesPerTest: 8,
        laborRatePerHour: 60_000,
        equipmentAllocationPerTest: 2_500,
        water: 300,
        wasteRate: 0.02,
        failureRepeatRate: 0.02,
        disposalPerTest: 500,
        validationCostAmortized: 4_000,
      },
      notes: "Kinetic fluorescent readout; includes fluorometer allocation and alternative-method validation amortization (Demo).",
    },
  ];

  const equivalenceRecords: EquivalenceRecord[] = [
    {
      ...ctx.canonical(EQUIVALENCES.tsaDeltaVsAcme),
      sourceSkuId: SKUS.tsaDelta500,
      candidateSkuId: SKUS.tsa500,
      classification: "functional_equivalent",
      overallScore: 78.5,
      dimensionScores: {
        formula_composition: { score: 85, weight: 25, note: "Both tryptic soy agar; peptone source differs slightly (Demo)." },
        intended_use_application: { score: 82, weight: 20, note: "Both positioned for microbial limits and EM (Demo)." },
        method_standard_compatibility: { score: 78, weight: 15, note: "DeltaBio ISO 11133 conformance is unverified (Demo)." },
        organism_performance: { score: 75, weight: 15, note: "GPT panel overlaps on 3 of 4 strains (Demo)." },
        preparation_conditions: { score: 72, weight: 10, note: "Same autoclave cycle; resolubility differs (Demo)." },
        regulatory_documents: { score: 60, weight: 5, note: "DeltaBio dossier lacks VN registration documents (Demo)." },
        format_pack: { score: 88, weight: 5, note: "Both 500 g bottles (Demo)." },
        local_availability: { score: 66, weight: 5, note: "DeltaBio lead time 3-5 weeks vs local stock (Demo)." },
      },
      rationale:
        "Both SKUs are tryptic soy agar dehydrated media in 500 g packs; DeltaBio is a workable substitute pending confirmation of its unverified ISO 11133 conformance (Demo assessment).",
      differences: [
        {
          dimension: "formula_composition",
          description: "Trace peptone source differs between the two formulations (Demo).",
          severity: "minor",
        },
        {
          dimension: "regulatory_documents",
          description: "DeltaBio dossier lacks Vietnam-specific registration documents (Demo).",
          severity: "moderate",
        },
        {
          dimension: "local_availability",
          description: "Acme SKU is stocked locally; DeltaBio ships on 3-5 week lead time (Demo).",
          severity: "moderate",
        },
      ],
      validationConsiderations: [
        "Run growth-promotion testing with the ATCC panel before substitution (Demo).",
        "Confirm autoclave cycle compatibility with the customer's validated cycle (Demo).",
        "Verify customer regulatory acceptance of the alternate dossier (Demo).",
      ],
      evidenceClaimIds: [CLAIMS.equivFormula, CLAIMS.tsaConforms],
      reviewerId: USERS.demoAnalyst,
      reviewState: "analyst_reviewed",
      lastReviewedAt: ctx.daysAgo(20),
    },
    {
      ...ctx.canonical(EQUIVALENCES.sdaVsTsaPlates),
      sourceSkuId: SKUS.sdaPlates20,
      candidateSkuId: SKUS.tsaPlates20,
      classification: "closest_alternative",
      overallScore: 59.5,
      dimensionScores: {
        formula_composition: { score: 45, weight: 25, note: "SDA is selective for fungi; TSA is general-purpose (Demo)." },
        intended_use_application: { score: 60, weight: 20, note: "Overlap limited to environmental monitoring (Demo)." },
        method_standard_compatibility: { score: 65, weight: 15, note: "Both reference ISO 11133 (Demo)." },
        organism_performance: { score: 55, weight: 15, note: "Different target organisms (Demo)." },
        preparation_conditions: { score: 70, weight: 10, note: "Both ready-to-use; storage identical (Demo)." },
        regulatory_documents: { score: 55, weight: 5, note: "Partial documentation overlap (Demo)." },
        format_pack: { score: 95, weight: 5, note: "Identical 90 mm plates, 20/pack (Demo)." },
        local_availability: { score: 75, weight: 5, note: "Both available ex-stock in VN (Demo)." },
      },
      rationale:
        "SDA ready plates are only a closest alternative to TSA ready plates: identical format and storage, but a selective fungal formulation that does not cover the general-purpose use cases (Demo assessment).",
      differences: [
        {
          dimension: "formula_composition",
          description: "SDA is selective for yeasts and molds; TSA is general-purpose (Demo).",
          severity: "major",
        },
        {
          dimension: "organism_performance",
          description: "Growth promotion panels barely overlap (Demo).",
          severity: "moderate",
        },
      ],
      validationConsiderations: [
        "Do not substitute for bacterial enumeration without a documented risk assessment (Demo).",
        "Confirm the monitoring plan's target organisms before switching (Demo).",
      ],
      evidenceClaimIds: [CLAIMS.tpShelfLife],
      reviewState: "source_captured",
    },
    {
      // Equipment equivalence: two closed sterility testing systems.
      ...ctx.canonical(EQUIVALENCES.st200VsSp3000),
      sourceSkuId: SKUS.sp3000,
      candidateSkuId: SKUS.st200,
      classification: "functional_equivalent",
      overallScore: 74.5,
      dimensionScores: {
        formula_composition: { score: 80, weight: 25, note: "Both closed membrane-filtration pump systems; SP-3000 adds electronic flow control (Demo)." },
        intended_use_application: { score: 90, weight: 20, note: "Both intended for USP <71> sterility testing (Demo)." },
        method_standard_compatibility: { score: 70, weight: 15, note: "SP-3000 USP <71> conformance still unverified (Demo)." },
        organism_performance: { score: 70, weight: 15, note: "No comparative recovery data on file for either system (Demo)." },
        preparation_conditions: { score: 85, weight: 10, note: "Both run the same SteriCan canister workflow (Demo)." },
        regulatory_documents: { score: 60, weight: 5, note: "Meridian dossier lacks VN registration documents (Demo)." },
        format_pack: { score: 90, weight: 5, note: "Both single pump units, benchtop footprint (Demo)." },
        local_availability: { score: 55, weight: 5, note: "ST-200 in stock; SP-3000 on 45-day import lead time (Demo)." },
      },
      rationale:
        "Both are closed membrane-filtration sterility testing systems accepting SteriCan canisters; the SP-3000 is a workable alternative pending verification of its USP <71> conformance claim (Demo assessment).",
      differences: [
        {
          dimension: "local_availability",
          description: "SP-3000 imports on ~45-day lead time while the ST-200 is stocked locally (Demo).",
          severity: "moderate",
        },
        {
          dimension: "method_standard_compatibility",
          description: "SP-3000 USP <71> conformance is an unverified catalogue claim (Demo).",
          severity: "moderate",
        },
      ],
      validationConsiderations: [
        "Run a parallel method suitability (bacteriostasis/fungistasis) study before switching systems (Demo).",
        "Confirm SteriCan canister lot-to-lot compatibility with the SP-3000 dock (Demo).",
      ],
      evidenceClaimIds: [CLAIMS.st200Sp3000Equiv, CLAIMS.sp3000Conforms],
      reviewState: "source_captured",
    },
    {
      // Assay equivalence: animal-free rFC vs compendial LAL gel-clot.
      ...ctx.canonical(EQUIVALENCES.rfcVsLal),
      sourceSkuId: SKUS.endoZyme192,
      candidateSkuId: SKUS.lalCart50,
      classification: "closest_alternative",
      overallScore: 62.5,
      dimensionScores: {
        formula_composition: { score: 40, weight: 25, note: "Recombinant Factor C reagent vs natural LAL — different reagent principle (Demo)." },
        intended_use_application: { score: 85, weight: 20, note: "Both intended for bacterial endotoxins testing (Demo)." },
        method_standard_compatibility: { score: 65, weight: 15, note: "rFC requires method validation as an alternative method under USP <85>; gel-clot is compendial (Demo)." },
        organism_performance: { score: 70, weight: 15, note: "Both detect gram-negative endotoxin; rFC is insensitive to glucan interference (Demo)." },
        preparation_conditions: { score: 75, weight: 10, note: "rFC kinetic fluorescent readout needs a fluorometer; gel-clot is read visually (Demo)." },
        regulatory_documents: { score: 60, weight: 5, note: "rFC acceptance varies by regulator and filing (Demo)." },
        format_pack: { score: 60, weight: 5, note: "192-test kit vs 50-cartridge kit (Demo)." },
        local_availability: { score: 70, weight: 5, note: "Both in stock locally (Demo)." },
      },
      rationale:
        "The rFC kit is a closest alternative to gel-clot LAL rather than a drop-in equivalent: same measurand and USP <85> anchor, but a different reagent principle that requires alternative-method validation (Demo assessment).",
      differences: [
        {
          dimension: "formula_composition",
          description: "Recombinant reagent vs horseshoe-crab lysate — different supply-chain and sustainability profile (Demo).",
          severity: "moderate",
        },
        {
          dimension: "method_standard_compatibility",
          description: "rFC is an alternative method under USP <85> and needs validation per product matrix (Demo).",
          severity: "major",
        },
      ],
      validationConsiderations: [
        "Run alternative-method validation (comparability vs gel-clot) per product matrix before adopting rFC (Demo).",
        "Confirm fluorometer availability in the QC lab (Demo).",
      ],
      evidenceClaimIds: [CLAIMS.rfcLalEquiv, CLAIMS.lalConforms],
      reviewState: "source_captured",
    },
  ];

  return {
    research_project: researchProjects,
    research_note: researchNotes,
    research_finding: researchFindings,
    research_project_entity: researchProjectEntities,
    saved_view: savedViews,
    research_export: researchExports,
    cost_per_test_scenario: costPerTestScenarios,
    equivalence_record: equivalenceRecords,
  };
}
