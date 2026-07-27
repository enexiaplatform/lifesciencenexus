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
