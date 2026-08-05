import type {
  AssetLifecycleEvent,
  AssetModel,
  ConsumableCompatibility,
  ConsumptionModel,
  InstalledAsset,
  MaintenanceEvent,
  ProductValidation,
  QualificationEvent,
  ReplacementAssumption,
  TrialEvent,
  VendorApproval,
} from "@/lib/domain/types";

import { edgeEvidence, type SeedContext } from "./context";
import {
  ASSET_EVENTS,
  ASSET_MODELS,
  ASSETS,
  BRANDS,
  COMPATIBILITIES,
  CONSUMPTION,
  DEMO_TENANT_ID,
  LABS,
  ORGS,
  REPLACEMENT_ASSUMPTIONS,
  SITES,
  SKUS,
  SOURCES,
  TRIALS,
  VALIDATIONS,
  VENDOR_APPROVALS,
} from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Installed-base fixtures for the Delta Pharma Plant HCMC account: two
 * instruments (air sampler with mapped consumables and a replacement due in
 * ~60 days; particle counter deliberately WITHOUT consumable mappings), their
 * lifecycle/maintenance/qualification history, vendor approvals (one expired,
 * one approved) and product validations (one in progress, one passed).
 */
export function seedAssets(ctx: SeedContext): DemoDatasetSlices {
  const assetModels: AssetModel[] = [
    {
      ...ctx.canonical(ASSET_MODELS.as100),
      manufacturerOrgId: ORGS.condor,
      brandId: BRANDS.condorAir,
      model: "AirSampler AS-100 (Demo)",
      category: "air_sampler",
    },
    {
      ...ctx.canonical(ASSET_MODELS.pc50),
      manufacturerOrgId: ORGS.condor,
      brandId: BRANDS.condorAir,
      model: "CondorCount PC-50 (Demo)",
      category: "particle_counter",
    },
    {
      ...ctx.canonical(ASSET_MODELS.ic35),
      manufacturerOrgId: ORGS.condor,
      brandId: BRANDS.condorAir,
      model: "Condor Incubator IC-35 (Demo)",
      category: "incubator",
    },
    {
      ...ctx.canonical(ASSET_MODELS.st200),
      manufacturerOrgId: ORGS.condor,
      brandId: BRANDS.condorSteri,
      model: "SteriTest ST-200 (Demo)",
      category: "sterility_testing",
    },
    {
      ...ctx.canonical(ASSET_MODELS.sp3000),
      manufacturerOrgId: ORGS.meridian,
      brandId: BRANDS.steripump,
      model: "SteriPump SP-3000 (Demo)",
      category: "sterility_testing",
    },
    {
      ...ctx.canonical(ASSET_MODELS.ag90),
      manufacturerOrgId: ORGS.meridian,
      brandId: BRANDS.meridianAir,
      model: "AirGuard AG-90 (Demo)",
      category: "air_sampler",
    },
    {
      ...ctx.canonical(ASSET_MODELS.pc90),
      manufacturerOrgId: ORGS.meridian,
      brandId: BRANDS.meridianAir,
      model: "PartiCount PC-90 (Demo)",
      category: "particle_counter",
    },
    {
      ...ctx.canonical(ASSET_MODELS.st300),
      manufacturerOrgId: ORGS.condor,
      brandId: BRANDS.condorSteri,
      model: "SteriTest ST-300 (Demo)",
      category: "sterility_testing",
    },
    {
      ...ctx.canonical(ASSET_MODELS.sp1000),
      manufacturerOrgId: ORGS.meridian,
      brandId: BRANDS.steripump,
      model: "SteriPump SP-1000 (Demo)",
      category: "sterility_testing",
    },
    {
      ...ctx.canonical(ASSET_MODELS.as200),
      manufacturerOrgId: ORGS.condor,
      brandId: BRANDS.condorAir,
      model: "AirSampler AS-200 (Demo)",
      category: "air_sampler",
    },
    {
      ...ctx.canonical(ASSET_MODELS.ag200),
      manufacturerOrgId: ORGS.meridian,
      brandId: BRANDS.meridianAir,
      model: "AirGuard AG-200 (Demo)",
      category: "air_sampler",
    },
  ];

  const installedAssets: InstalledAsset[] = [
    {
      // Replacement due in ~60 days → equipment_replacement_due (high).
      ...ctx.tenantPrivate(ASSETS.as100, DEMO_TENANT_ID),
      assetModelId: ASSET_MODELS.as100,
      siteId: SITES.deltaPharmaPlant,
      laboratoryId: LABS.deltaPharmaMicro,
      serialNumber: "DEMO-AS100-0042",
      installationDate: ctx.daysAgo(2100),
      status: "operational",
      qualificationStatus: "iq_oq_pq_complete",
      serviceProviderOrgId: ORGS.mekong,
      expectedReplacementDate: ctx.daysAhead(60),
      estimatedAnnualConsumption: 480,
      confidence: 0.9,
    },
    {
      // No consumable_compatibility rows for model PC-50 → asset_without_consumables.
      ...ctx.tenantPrivate(ASSETS.pc50, DEMO_TENANT_ID),
      assetModelId: ASSET_MODELS.pc50,
      siteId: SITES.deltaPharmaPlant,
      laboratoryId: LABS.deltaPharmaMicro,
      serialNumber: "DEMO-PC50-0007",
      installationDate: ctx.daysAgo(1500),
      status: "operational",
      qualificationStatus: "partial",
      serviceProviderOrgId: ORGS.mekong,
      confidence: 0.75,
    },
    {
      // Incubator at the dairy account — no consumable mappings either, so it
      // joins the asset_without_consumables signal set.
      ...ctx.tenantPrivate(ASSETS.ic35, DEMO_TENANT_ID),
      assetModelId: ASSET_MODELS.ic35,
      siteId: SITES.songHuongPlant,
      laboratoryId: LABS.songHuongMicro,
      serialNumber: "DEMO-IC35-0019",
      installationDate: ctx.daysAgo(800),
      status: "operational",
      qualificationStatus: "partial",
      serviceProviderOrgId: ORGS.hongHa,
      confidence: 0.8,
    },
    {
      // SteriTest ST-200 in routine use — compatible consumables mapped, so it
      // demonstrates the consumable_pullthrough signal for closed systems.
      ...ctx.tenantPrivate(ASSETS.st200, DEMO_TENANT_ID),
      assetModelId: ASSET_MODELS.st200,
      siteId: SITES.deltaPharmaPlant,
      laboratoryId: LABS.deltaPharmaMicro,
      serialNumber: "DEMO-ST200-0011",
      installationDate: ctx.daysAgo(700),
      status: "operational",
      qualificationStatus: "iq_oq_pq_complete",
      serviceProviderOrgId: ORGS.mekong,
      estimatedAnnualConsumption: 600,
      confidence: 0.85,
    },
  ];

  const assetLifecycleEvents: AssetLifecycleEvent[] = [
    {
      ...ctx.tenantPrivate(ASSET_EVENTS.as100Installed, DEMO_TENANT_ID),
      installedAssetId: ASSETS.as100,
      type: "installed",
      at: ctx.daysAgo(2100),
      description: "Installed in QC Microbiology Laboratory (Demo).",
    },
    {
      ...ctx.tenantPrivate(ASSET_EVENTS.pc50Installed, DEMO_TENANT_ID),
      installedAssetId: ASSETS.pc50,
      type: "installed",
      at: ctx.daysAgo(1500),
      description: "Installed in QC Microbiology Laboratory (Demo).",
    },
    {
      ...ctx.tenantPrivate(ASSET_EVENTS.ic35Installed, DEMO_TENANT_ID),
      installedAssetId: ASSETS.ic35,
      type: "installed",
      at: ctx.daysAgo(800),
      description: "Installed in Dairy QC Microbiology Laboratory (Demo).",
    },
    {
      ...ctx.tenantPrivate(ASSET_EVENTS.st200Installed, DEMO_TENANT_ID),
      installedAssetId: ASSETS.st200,
      type: "installed",
      at: ctx.daysAgo(700),
      description: "Installed in QC Microbiology Laboratory sterility suite (Demo).",
    },
  ];

  const maintenanceEvents: MaintenanceEvent[] = [
    {
      ...ctx.tenantPrivate(ASSET_EVENTS.as100Calibration, DEMO_TENANT_ID),
      installedAssetId: ASSETS.as100,
      type: "calibration",
      at: ctx.daysAgo(150),
      providerOrgId: ORGS.mekong,
      description: "Annual flow-rate calibration (Demo).",
      nextDueDate: ctx.daysAhead(215),
    },
  ];

  const qualificationEvents: QualificationEvent[] = [
    {
      ...ctx.tenantPrivate(ASSET_EVENTS.as100Pq, DEMO_TENANT_ID),
      installedAssetId: ASSETS.as100,
      kind: "PQ",
      at: ctx.daysAgo(2000),
      passed: true,
    },
  ];

  const consumableCompatibilities: ConsumableCompatibility[] = [
    {
      ...ctx.canonical(COMPATIBILITIES.as100Em),
      assetModelId: ASSET_MODELS.as100,
      skuId: SKUS.emContact20,
      evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.85),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.as100Tp),
      assetModelId: ASSET_MODELS.as100,
      skuId: SKUS.tsaPlates20,
      evidence: edgeEvidence(SOURCES.fieldObservation, "unverified", 0.6),
    },
    {
      // Both closed sterility testing systems use the same SteriCan canisters —
      // the cross-brand consumable anchor for the category comparison view.
      ...ctx.canonical(COMPATIBILITIES.st200Steri),
      assetModelId: ASSET_MODELS.st200,
      skuId: SKUS.steriCan10,
      evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.9),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.sp3000Steri),
      assetModelId: ASSET_MODELS.sp3000,
      skuId: SKUS.steriCan10,
      evidence: edgeEvidence(SOURCES.meridianCatalogue, "source_captured", 0.8),
    },
    {
      // SP-3000 also takes Meridian's own closed canisters — the SP-3000 shelf
      // row therefore shows both the own-brand and the cross-brand option.
      ...ctx.canonical(COMPATIBILITIES.sp3000SpCan),
      assetModelId: ASSET_MODELS.sp3000,
      skuId: SKUS.spCan10,
      evidence: edgeEvidence(SOURCES.meridianCatalogue, "source_captured", 0.9),
    },
    {
      // AirGuard AG-90 takes standard 90 mm plates from any media brand — the
      // open-system counterpoint to the AS-100's proprietary contact plates.
      ...ctx.canonical(COMPATIBILITIES.ag90Tsa),
      assetModelId: ASSET_MODELS.ag90,
      skuId: SKUS.tsaPlates20,
      evidence: edgeEvidence(SOURCES.meridianCatalogue, "source_captured", 0.85),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.ag90Sda),
      assetModelId: ASSET_MODELS.ag90,
      skuId: SKUS.sdaPlates20,
      evidence: edgeEvidence(SOURCES.meridianCatalogue, "source_captured", 0.8),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.st300Steri),
      assetModelId: ASSET_MODELS.st300,
      skuId: SKUS.steriCan10,
      evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.9),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.sp1000SpCan),
      assetModelId: ASSET_MODELS.sp1000,
      skuId: SKUS.spCan10,
      evidence: edgeEvidence(SOURCES.meridianCatalogue, "source_captured", 0.85),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.as200Em),
      assetModelId: ASSET_MODELS.as200,
      skuId: SKUS.emContact20,
      evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.85),
    },
    {
      ...ctx.canonical(COMPATIBILITIES.ag200Tsa),
      assetModelId: ASSET_MODELS.ag200,
      skuId: SKUS.tsaPlates20,
      evidence: edgeEvidence(SOURCES.meridianCatalogue, "source_captured", 0.85),
    },
  ];

  const consumptionModels: ConsumptionModel[] = [
    {
      ...ctx.tenantPrivate(CONSUMPTION.as100Em, DEMO_TENANT_ID),
      installedAssetId: ASSETS.as100,
      skuId: SKUS.emContact20,
      estimatedAnnualQuantity: 480,
      basis: "40 plates/month × 12 (Demo)",
      confidence: 0.7,
    },
  ];

  const replacementAssumptions: ReplacementAssumption[] = [
    {
      ...ctx.tenantPrivate(REPLACEMENT_ASSUMPTIONS.airSampler, DEMO_TENANT_ID),
      assetCategory: "air_sampler",
      typicalLifetimeYears: 8,
      geographyCode: "VN",
      basis: "Demo industry rule of thumb for 100 L/min samplers.",
    },
  ];

  const vendorApprovals: VendorApproval[] = [
    {
      // Expired ~90 days ago → vendor_approval_gap (high).
      ...ctx.tenantPrivate(VENDOR_APPROVALS.mekongExpired, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      supplierOrgId: ORGS.mekong,
      status: "expired",
      validTo: ctx.daysAgo(90),
      evidence: edgeEvidence(SOURCES.fieldObservation, "source_captured", 0.8),
    },
    {
      ...ctx.tenantPrivate(VENDOR_APPROVALS.saigonApproved, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      supplierOrgId: ORGS.saigon,
      status: "approved",
      validTo: ctx.daysAhead(365),
      evidence: edgeEvidence(SOURCES.fieldObservation, "source_captured", 0.85),
    },
    {
      ...ctx.tenantPrivate(VENDOR_APPROVALS.hongHaSongHuong, DEMO_TENANT_ID),
      organizationId: ORGS.songHuong,
      supplierOrgId: ORGS.hongHa,
      status: "pending",
      validTo: ctx.daysAhead(200),
      evidence: edgeEvidence(SOURCES.internalNote, "unverified", 0.5),
    },
  ];

  const productValidations: ProductValidation[] = [
    {
      // In progress → validation_pending signal.
      ...ctx.tenantPrivate(VALIDATIONS.tdInProgress, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      skuId: SKUS.tsaDelta500,
      status: "in_progress",
      method: "Growth promotion per ISO 11133 (Demo protocol)",
    },
    {
      ...ctx.tenantPrivate(VALIDATIONS.tsaPassed, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      skuId: SKUS.tsa500,
      status: "passed",
      method: "Growth promotion per ISO 11133 (Demo protocol)",
      completedAt: ctx.daysAgo(300),
    },
    {
      // Planned → also feeds the validation_pending signal alongside the
      // in-progress DeltaBio TSA validation.
      ...ctx.tenantPrivate(VALIDATIONS.spCanPlanned, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      skuId: SKUS.spCan10,
      status: "planned",
      method: "Canister integrity + membrane recovery per USP <71> (Demo protocol)",
    },
  ];

  const trialEvents: TrialEvent[] = [
    {
      ...ctx.tenantPrivate(TRIALS.tdSample, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      skuId: SKUS.tsaDelta500,
      type: "sample_sent",
      at: ctx.daysAgo(120),
      notes: "Two 500 g bottles sent for GPT (Demo).",
    },
    {
      ...ctx.tenantPrivate(TRIALS.tdStarted, DEMO_TENANT_ID),
      organizationId: ORGS.deltaPharma,
      skuId: SKUS.tsaDelta500,
      productValidationId: VALIDATIONS.tdInProgress,
      type: "trial_started",
      at: ctx.daysAgo(90),
      outcome: "GPT runs underway (Demo).",
    },
  ];

  return {
    asset_model: assetModels,
    installed_asset: installedAssets,
    asset_lifecycle_event: assetLifecycleEvents,
    maintenance_event: maintenanceEvents,
    qualification_event: qualificationEvents,
    consumable_compatibility: consumableCompatibilities,
    consumption_model: consumptionModels,
    replacement_assumption: replacementAssumptions,
    vendor_approval: vendorApprovals,
    product_validation: productValidations,
    trial_event: trialEvents,
  };
}
