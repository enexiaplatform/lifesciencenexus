import type { DuplicateCandidate } from "@/lib/domain/types";
import type { DuplicateEntityInput } from "@/lib/domain/entity-resolution";
import { findDuplicateCandidates } from "@/lib/domain/entity-resolution";
import { ENTITY_TYPES } from "@/lib/domain/types";

import { seedAssets } from "./assets";
import { createSeedContext, type SeedContext } from "./context";
import { seedEvidence } from "./evidence";
import { seedOrganizations } from "./organizations";
import { seedPrices } from "./prices";
import { seedProducts } from "./products";
import { seedResearch } from "./research";
import { seedTenancy } from "./tenancy";
import { seedTenders } from "./tenders";
import type { DemoDataset, DemoDatasetSlices } from "./types";

export { DEMO_TENANT_ID, OTHER_TENANT_ID, USERS } from "./ids";
export type { DemoDataset, DemoDatasetSlices } from "./types";
export type { SeedContext } from "./context";

/**
 * Assemble the full synthetic demo dataset.
 *
 * `now` anchors every relative date (signal windows, stale prices, review-due
 * claims, replacement dates), so tests pass a fixed clock and the app passes
 * the real one. Duplicate candidates are computed with the real
 * entity-resolution engine — their `matchedOn` explanations are genuine.
 */
export function buildDemoDataset(now: Date = new Date()): DemoDataset {
  const ctx = createSeedContext(now);

  const products = seedProducts(ctx);
  const slices: DemoDatasetSlices = {
    ...seedTenancy(ctx),
    ...seedOrganizations(ctx),
    ...products,
    ...seedEvidence(ctx),
    ...seedPrices(ctx, products.pack_configuration ?? []),
    ...seedTenders(ctx),
    ...seedAssets(ctx),
    ...seedResearch(ctx),
  };

  return {
    generatedAt: now.toISOString(),
    ...slices,
    duplicate_candidate: computeDuplicateCandidates(ctx, slices),
  };
}

/** Entity counts per type (types with zero records omitted) — for reporting/tests. */
export function demoDatasetStats(dataset: DemoDataset): Partial<Record<string, number>> {
  const stats: Partial<Record<string, number>> = {};
  for (const type of ENTITY_TYPES) {
    const records: unknown = dataset[type];
    if (Array.isArray(records) && records.length > 0) stats[type] = records.length;
  }
  return stats;
}

function computeDuplicateCandidates(ctx: SeedContext, slices: DemoDatasetSlices): DuplicateCandidate[] {
  const organizations = slices.organization ?? [];
  const aliases = slices.organization_alias ?? [];
  const sites = slices.site ?? [];
  const addresses = slices.address ?? [];
  const addressById = new Map(addresses.map((address) => [address.id, address]));

  const firstAddressOf = (organizationId: string): string | undefined => {
    const site = sites.find((candidate) => candidate.organizationId === organizationId && candidate.addressId);
    const address = site?.addressId ? addressById.get(site.addressId) : undefined;
    if (!address) return undefined;
    return [address.city, address.province].filter((part): part is string => part !== undefined).join(" ");
  };

  const orgInputs: DuplicateEntityInput[] = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    aliases: aliases.filter((alias) => alias.organizationId === org.id).map((alias) => alias.alias),
    identifiers: org.identifiers,
    domain: domainOf(org.website),
    address: firstAddressOf(org.id),
  }));

  const skuInputs: DuplicateEntityInput[] = (slices.sku ?? []).map((sku) => ({
    id: sku.id,
    name: sku.name,
    aliases: sku.alternateNames,
    catalogueNumber: sku.catalogueNumber,
  }));

  const pairs = [
    ...findDuplicateCandidates(orgInputs).map((pair) => ({ entityType: "organization" as const, ...pair })),
    ...findDuplicateCandidates(skuInputs).map((pair) => ({ entityType: "sku" as const, ...pair })),
  ];

  return pairs.map((pair, index) => ({
    ...ctx.canonical(`dup-${pair.entityType}-${index + 1}`),
    entityType: pair.entityType,
    leftId: pair.leftId,
    rightId: pair.rightId,
    score: pair.score,
    matchedOn: pair.matchedOn,
    status: "pending",
  }));
}

function domainOf(website: string | undefined): string | undefined {
  if (!website) return undefined;
  try {
    return new URL(website).hostname;
  } catch {
    return undefined;
  }
}
