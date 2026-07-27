import type { BaseEntity, ConfidenceDimensions, EdgeEvidence, EvidenceState } from "@/lib/domain/types";

/**
 * Helpers shared by all demo seed modules: a clock anchored at the `now`
 * passed to `buildDemoDataset()` plus audit-field factories so every record
 * gets consistent, deterministic base fields.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface SeedContext {
  /** Anchor moment for every relative date in the dataset. */
  now: Date;
  /** ISO calendar date (YYYY-MM-DD) `days` before now. */
  daysAgo(days: number): string;
  /** ISO calendar date (YYYY-MM-DD) `days` after now. */
  daysAhead(days: number): string;
  /** Full ISO datetime `days` before now. */
  dateTimeDaysAgo(days: number): string;
  /** Audit fields for a canonical shared-graph record (still synthetic). */
  canonical(id: string): BaseEntity;
  /** Audit fields (incl. tenantId) for a tenant-private overlay record. */
  tenantPrivate(id: string, tenantId: string): BaseEntity & { tenantId: string };
}

export function createSeedContext(now: Date): SeedContext {
  const shift = (days: number): Date => new Date(now.getTime() + days * MS_PER_DAY);
  const isoDate = (days: number): string => shift(days).toISOString().slice(0, 10);
  const iso = now.toISOString();

  const canonical = (id: string): BaseEntity => ({
    id,
    createdAt: iso,
    updatedAt: iso,
    createdBy: "system",
    updatedBy: "system",
    visibility: "canonical",
    isDemo: true,
  });

  const tenantPrivate = (id: string, tenantId: string): BaseEntity & { tenantId: string } => ({
    ...canonical(id),
    tenantId,
    visibility: "tenant_private",
  });

  return {
    now,
    daysAgo: (days) => isoDate(-days),
    daysAhead: (days) => isoDate(days),
    dateTimeDaysAgo: (days) => shift(-days).toISOString(),
    canonical,
    tenantPrivate,
  };
}

/** Uniform confidence at `value` across all seven dimensions. */
export function confidence(value: number): ConfidenceDimensions {
  return {
    sourceAuthority: value,
    sourceRecency: value,
    entityMatch: value,
    extraction: value,
    technicalEquivalence: value,
    geographicRelevance: value,
    commercialRelevance: value,
  };
}

/** Edge evidence shorthand used across the seeded graph edges. */
export function edgeEvidence(sourceId: string, state: EvidenceState, score: number, notes?: string): EdgeEvidence {
  return { sourceId, confidence: score, state, notes };
}
