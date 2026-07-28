import type { ResearchFindingKind } from "@/lib/domain/types";

/**
 * Shared presentation for the five research-finding kinds. Kept in a
 * server-safe module (no "use client") so both the workspace panels and the
 * printable report can use it.
 */
export const FINDING_KIND_STYLES: Record<
  ResearchFindingKind,
  { label: string; className: string }
> = {
  verified_fact: {
    label: "Verified fact",
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  analyst_interpretation: {
    label: "Analyst interpretation",
    className: "border-accent/30 bg-accent/10 text-accent",
  },
  assumption: {
    label: "Assumption",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  unknown: { label: "Unknown", className: "border-red-200 bg-red-50 text-red-700" },
  recommendation: {
    label: "Recommendation",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
};

/** Display order for finding groups (facts first, recommendations last). */
export const FINDING_KIND_ORDER: ResearchFindingKind[] = [
  "verified_fact",
  "analyst_interpretation",
  "assumption",
  "unknown",
  "recommendation",
];
