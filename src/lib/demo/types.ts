import type { EntityType, EntityTypeMap } from "@/lib/domain/types";

/**
 * Shape of the assembled synthetic demo dataset.
 *
 * The dataset is a bag of fully-formed entities keyed by entity type, which
 * lets the demo repository load it bucket-by-bucket with no further mapping.
 * Every record is synthetic (`isDemo: true`); tenant-scoped records belong to
 * `tenant_demo` except a deliberate pair of `tenant_other` records used to
 * prove tenant isolation.
 *
 * Dates that must stay "fresh" relative to the reader (signal windows, stale
 * prices, review-due claims) are computed from the `now` passed to
 * `buildDemoDataset()` — never hard-coded.
 */

export type DemoDatasetSlices = Partial<{ [K in EntityType]: Array<EntityTypeMap[K]> }>;

export interface DemoDataset extends DemoDatasetSlices {
  /** ISO datetime the dataset was generated; all relative dates anchor to it. */
  generatedAt: string;
}
