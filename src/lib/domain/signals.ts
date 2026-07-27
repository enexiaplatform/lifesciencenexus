import { daysSince, daysUntil } from "./freshness";
import type {
  AvailabilityObservation,
  ConsumableCompatibility,
  DistributionAgreement,
  EntityRef,
  InstalledAsset,
  OpportunitySignal,
  PriceObservation,
  Product,
  ProductValidation,
  SignalCommercialRelevance,
  SignalType,
  SupplierListing,
  Tender,
  VendorApproval,
} from "./types";

/**
 * Opportunity-signal engine.
 *
 * Pure and deterministic given `snapshot.now`: the same snapshot always
 * produces the same signals in the same order. Every signal explains itself
 * through `triggeringRecordIds` and a human-readable `reason` — a signal that
 * cannot point at its evidence must not exist.
 *
 * Implemented rules (12 of the 19 signal types; the rest need data sources
 * that are not part of this snapshot, e.g. facility news or regulatory feeds):
 * equipment_replacement_due, consumable_pullthrough, tender_renewal_expected,
 * supplier_agreement_expired, price_stale, competitor_product_discontinued,
 * asset_without_consumables, vendor_approval_gap, validation_pending,
 * repeated_stock_issue, unusual_price_increase, incomplete_product_coverage.
 */

export const REPLACEMENT_DUE_WINDOW_DAYS = 180;
export const TENDER_RENEWAL_WINDOW_DAYS = 120;
export const PRICE_STALE_AFTER_DAYS = 180;
export const UNUSUAL_PRICE_INCREASE_RATIO = 0.2;
export const STOCK_ISSUE_WINDOW_DAYS = 90;
export const STOCK_ISSUE_MIN_OCCURRENCES = 2;

export interface SignalSnapshot {
  installedAssets: InstalledAsset[];
  tenders: Tender[];
  priceObservations: PriceObservation[];
  distributionAgreements: DistributionAgreement[];
  products: Product[];
  supplierListings: SupplierListing[];
  consumableCompatibilities: ConsumableCompatibility[];
  vendorApprovals: VendorApproval[];
  productValidations: ProductValidation[];
  availabilityObservations: AvailabilityObservation[];
  /** Clock injected for determinism. */
  now: Date | string;
}

/** A signal before persistence: repository assigns id/tenant/audit fields. */
export type GeneratedSignal = Omit<
  OpportunitySignal,
  "id" | "tenantId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "visibility" | "isDemo" | "archivedAt"
>;

function signal(
  type: SignalType,
  relatedEntities: EntityRef[],
  triggeringRecordIds: string[],
  reason: string,
  confidence: number,
  commercialRelevance: SignalCommercialRelevance,
  recommendedAction: string,
  generatedAt: string,
  expiresAt?: string,
): GeneratedSignal {
  return {
    type,
    relatedEntities,
    triggeringRecordIds,
    reason,
    confidence,
    commercialRelevance,
    generatedAt,
    expiresAt,
    recommendedAction,
    status: "new",
  };
}

/** Add calendar months to an ISO date, return ISO date (YYYY-MM-DD). */
function addMonthsIso(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${isoDate}`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function toIso(now: Date | string): string {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid 'now': ${String(now)}`);
  return date.toISOString();
}

function activeAssets(assets: readonly InstalledAsset[]): InstalledAsset[] {
  return assets.filter((asset) => asset.status !== "retired");
}

// ---------------------------------------------------------------------------
// Individual rules (each returns zero or more signals)
// ---------------------------------------------------------------------------

function ruleEquipmentReplacementDue(snapshot: SignalSnapshot, now: string, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const asset of activeAssets(snapshot.installedAssets)) {
    if (!asset.expectedReplacementDate) continue;
    const days = daysUntil(asset.expectedReplacementDate, now);
    if (days < 0 || days > REPLACEMENT_DUE_WINDOW_DAYS) continue;
    out.push(
      signal(
        "equipment_replacement_due",
        [{ entityType: "installed_asset", entityId: asset.id }],
        [asset.id],
        `Installed asset ${asset.id} (model ${asset.assetModelId}) is due for replacement on ${asset.expectedReplacementDate} (in ${days} days).`,
        asset.confidence,
        days <= 90 ? "high" : "medium",
        "Engage the site about replacement options and quote timing.",
        isoNow,
        asset.expectedReplacementDate,
      ),
    );
  }
  return out;
}

function ruleConsumablePullthrough(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const modelsWithConsumables = new Set(snapshot.consumableCompatibilities.map((c) => c.assetModelId));
  const out: GeneratedSignal[] = [];
  for (const asset of activeAssets(snapshot.installedAssets)) {
    if (asset.status !== "operational") continue;
    if (!modelsWithConsumables.has(asset.assetModelId)) continue;
    const compatible = snapshot.consumableCompatibilities.filter((c) => c.assetModelId === asset.assetModelId);
    out.push(
      signal(
        "consumable_pullthrough",
        [{ entityType: "installed_asset", entityId: asset.id }],
        [asset.id, ...compatible.map((c) => c.id)],
        `Operational asset ${asset.id} (model ${asset.assetModelId}) has ${compatible.length} compatible consumable SKU(s) — recurring pull-through opportunity.`,
        asset.confidence,
        asset.estimatedAnnualConsumption !== undefined ? "medium" : "low",
        "Track consumable consumption and secure the recurring supply agreement.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleTenderRenewalExpected(snapshot: SignalSnapshot, now: string, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const tender of snapshot.tenders) {
    if (tender.status !== "awarded" || !tender.awardDate || !tender.contractPeriodMonths) continue;
    const contractEnd = addMonthsIso(tender.awardDate, tender.contractPeriodMonths);
    const days = daysUntil(contractEnd, now);
    if (days < 0 || days > TENDER_RENEWAL_WINDOW_DAYS) continue;
    out.push(
      signal(
        "tender_renewal_expected",
        [
          { entityType: "tender", entityId: tender.id },
          { entityType: "organization", entityId: tender.buyerOrganizationId },
        ],
        [tender.id],
        `Tender ${tender.code} was awarded on ${tender.awardDate} for ${tender.contractPeriodMonths} months; the contract ends ${contractEnd} (in ${days} days) and a renewal tender is likely.`,
        0.7,
        days <= 60 ? "high" : "medium",
        "Prepare the renewal bid: confirm incumbents, specifications and timing with the buyer.",
        isoNow,
        contractEnd,
      ),
    );
  }
  return out;
}

function ruleSupplierAgreementExpired(snapshot: SignalSnapshot, now: string, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const agreement of snapshot.distributionAgreements) {
    if (!agreement.validTo) continue;
    const days = daysUntil(agreement.validTo, now);
    if (days >= 0) continue;
    out.push(
      signal(
        "supplier_agreement_expired",
        [
          { entityType: "organization", entityId: agreement.manufacturerOrgId },
          { entityType: "organization", entityId: agreement.distributorOrgId },
        ],
        [agreement.id],
        `Distribution agreement between manufacturer ${agreement.manufacturerOrgId} and distributor ${agreement.distributorOrgId} expired on ${agreement.validTo} (${-days} days ago).`,
        agreement.evidence.confidence,
        "high",
        "Verify whether the agreement was renewed; update the supplier profile and listings accordingly.",
        isoNow,
      ),
    );
  }
  return out;
}

function latestObservationPerSku(observations: readonly PriceObservation[]): Map<string, PriceObservation> {
  const latest = new Map<string, PriceObservation>();
  for (const observation of observations) {
    const current = latest.get(observation.skuId);
    if (!current || observation.observationDate > current.observationDate) {
      latest.set(observation.skuId, observation);
    }
  }
  return latest;
}

function rulePriceStale(snapshot: SignalSnapshot, now: string, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const observation of latestObservationPerSku(snapshot.priceObservations).values()) {
    const age = daysSince(observation.observationDate, now);
    if (age <= PRICE_STALE_AFTER_DAYS) continue;
    out.push(
      signal(
        "price_stale",
        [{ entityType: "sku", entityId: observation.skuId }],
        [observation.id],
        `The most recent price for SKU ${observation.skuId} is ${age} days old (observed ${observation.observationDate}).`,
        0.8,
        "medium",
        "Request a fresh quotation before quoting or benchmarking this SKU.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleCompetitorProductDiscontinued(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const product of snapshot.products) {
    if (product.status !== "discontinued") continue;
    out.push(
      signal(
        "competitor_product_discontinued",
        [{ entityType: "product", entityId: product.id }],
        [product.id],
        `Product '${product.name}' (${product.id}) is discontinued — its installed user base may need alternatives.`,
        0.85,
        "medium",
        "Identify customers using the discontinued product and propose validated alternatives.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleAssetWithoutConsumables(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const modelsWithConsumables = new Set(snapshot.consumableCompatibilities.map((c) => c.assetModelId));
  const out: GeneratedSignal[] = [];
  for (const asset of activeAssets(snapshot.installedAssets)) {
    if (modelsWithConsumables.has(asset.assetModelId)) continue;
    out.push(
      signal(
        "asset_without_consumables",
        [{ entityType: "installed_asset", entityId: asset.id }],
        [asset.id],
        `Installed asset ${asset.id} (model ${asset.assetModelId}) has no consumable compatibility records — either unmapped evidence or a missed recurring-revenue stream.`,
        asset.confidence,
        "medium",
        "Map compatible consumables for this asset model, then quote the recurring supply.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleVendorApprovalGap(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const approval of snapshot.vendorApprovals) {
    if (approval.status !== "rejected" && approval.status !== "expired") continue;
    out.push(
      signal(
        "vendor_approval_gap",
        [
          { entityType: "organization", entityId: approval.organizationId },
          { entityType: "organization", entityId: approval.supplierOrgId },
        ],
        [approval.id],
        `Vendor approval of supplier ${approval.supplierOrgId} at customer ${approval.organizationId} is '${approval.status}' — sales through this channel are blocked.`,
        approval.evidence.confidence,
        "high",
        "Resolve the approval gap (re-qualification, documentation) before committing supply.",
        isoNow,
        approval.validTo,
      ),
    );
  }
  return out;
}

function ruleValidationPending(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const out: GeneratedSignal[] = [];
  for (const validation of snapshot.productValidations) {
    if (validation.status !== "planned" && validation.status !== "in_progress") continue;
    out.push(
      signal(
        "validation_pending",
        [
          { entityType: "organization", entityId: validation.organizationId },
          { entityType: "sku", entityId: validation.skuId },
        ],
        [validation.id],
        `Validation of SKU ${validation.skuId} at customer ${validation.organizationId} is '${validation.status}' — adoption is blocked until it completes.`,
        0.9,
        "medium",
        "Support the validation (samples, documentation, technical data) to unblock adoption.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleRepeatedStockIssue(snapshot: SignalSnapshot, now: string, isoNow: string): GeneratedSignal[] {
  const bySkuAndSupplier = new Map<string, AvailabilityObservation[]>();
  for (const observation of snapshot.availabilityObservations) {
    const key = `${observation.skuId}::${observation.supplierOrgId}`;
    const list = bySkuAndSupplier.get(key) ?? [];
    list.push(observation);
    bySkuAndSupplier.set(key, list);
  }
  const out: GeneratedSignal[] = [];
  for (const [key, observations] of bySkuAndSupplier) {
    const recentIssues = observations.filter(
      (observation) =>
        (observation.status === "limited" || observation.status === "out_of_stock") &&
        daysSince(observation.observedAt, now) <= STOCK_ISSUE_WINDOW_DAYS,
    );
    if (recentIssues.length < STOCK_ISSUE_MIN_OCCURRENCES) continue;
    const [skuId, supplierOrgId] = key.split("::");
    out.push(
      signal(
        "repeated_stock_issue",
        [
          { entityType: "sku", entityId: skuId },
          { entityType: "organization", entityId: supplierOrgId },
        ],
        recentIssues.map((observation) => observation.id),
        `SKU ${skuId} at supplier ${supplierOrgId} showed ${recentIssues.length} stock issues (limited/out of stock) within ${STOCK_ISSUE_WINDOW_DAYS} days.`,
        0.7,
        "medium",
        "Approach affected customers with reliable-supply positioning or safety-stock offers.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleUnusualPriceIncrease(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const bySku = new Map<string, PriceObservation[]>();
  for (const observation of snapshot.priceObservations) {
    const list = bySku.get(observation.skuId) ?? [];
    list.push(observation);
    bySku.set(observation.skuId, list);
  }
  const out: GeneratedSignal[] = [];
  for (const [skuId, observations] of bySku) {
    const sorted = [...observations].sort((a, b) => a.observationDate.localeCompare(b.observationDate));
    // Compare adjacent observations in the SAME currency only — cross-currency
    // comparison without an FX snapshot would be a silent conversion.
    let violation: { previous: PriceObservation; current: PriceObservation; ratio: number } | null = null;
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (previous.originalCurrency !== current.originalCurrency) continue;
      if (previous.originalAmount <= 0) continue;
      const ratio = (current.originalAmount - previous.originalAmount) / previous.originalAmount;
      if (ratio > UNUSUAL_PRICE_INCREASE_RATIO) {
        violation = { previous, current, ratio };
      }
    }
    if (!violation) continue;
    const pct = Math.round(violation.ratio * 1000) / 10;
    out.push(
      signal(
        "unusual_price_increase",
        [{ entityType: "sku", entityId: skuId }],
        [violation.previous.id, violation.current.id],
        `Price for SKU ${skuId} rose ${pct}% from ${violation.previous.originalAmount} to ${violation.current.originalAmount} ${violation.current.originalCurrency} between ${violation.previous.observationDate} and ${violation.current.observationDate}.`,
        0.75,
        "medium",
        "Investigate the increase; customers facing similar rises may be open to alternatives.",
        isoNow,
      ),
    );
  }
  return out;
}

function ruleIncompleteProductCoverage(snapshot: SignalSnapshot, isoNow: string): GeneratedSignal[] {
  const skusWithPrices = new Set(snapshot.priceObservations.map((observation) => observation.skuId));
  const skusWithAvailability = new Set(snapshot.availabilityObservations.map((observation) => observation.skuId));
  const listingsBySku = new Map<string, SupplierListing[]>();
  for (const listing of snapshot.supplierListings) {
    const list = listingsBySku.get(listing.skuId) ?? [];
    list.push(listing);
    listingsBySku.set(listing.skuId, list);
  }
  const out: GeneratedSignal[] = [];
  for (const [skuId, listings] of listingsBySku) {
    if (skusWithPrices.has(skuId) || skusWithAvailability.has(skuId)) continue;
    out.push(
      signal(
        "incomplete_product_coverage",
        [{ entityType: "sku", entityId: skuId }],
        listings.map((listing) => listing.id),
        `SKU ${skuId} is listed by ${listings.length} supplier(s) but has no price observations and no availability observations — commercial evidence coverage is incomplete.`,
        0.6,
        "low",
        "Capture a quotation or stock observation for this SKU to complete its commercial profile.",
        isoNow,
      ),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Engine entry point
// ---------------------------------------------------------------------------

/**
 * Generate all signals for a snapshot. Output order is deterministic:
 * by signal type, then first triggering record id, then reason.
 */
export function generateSignals(snapshot: SignalSnapshot): GeneratedSignal[] {
  const isoNow = toIso(snapshot.now);
  const now = isoNow;
  const signals: GeneratedSignal[] = [
    ...ruleEquipmentReplacementDue(snapshot, now, isoNow),
    ...ruleConsumablePullthrough(snapshot, isoNow),
    ...ruleTenderRenewalExpected(snapshot, now, isoNow),
    ...ruleSupplierAgreementExpired(snapshot, now, isoNow),
    ...rulePriceStale(snapshot, now, isoNow),
    ...ruleCompetitorProductDiscontinued(snapshot, isoNow),
    ...ruleAssetWithoutConsumables(snapshot, isoNow),
    ...ruleVendorApprovalGap(snapshot, isoNow),
    ...ruleValidationPending(snapshot, isoNow),
    ...ruleRepeatedStockIssue(snapshot, now, isoNow),
    ...ruleUnusualPriceIncrease(snapshot, isoNow),
    ...ruleIncompleteProductCoverage(snapshot, isoNow),
  ];
  return signals.sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      (a.triggeringRecordIds[0] ?? "").localeCompare(b.triggeringRecordIds[0] ?? "") ||
      a.reason.localeCompare(b.reason),
  );
}
