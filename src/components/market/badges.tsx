import { Badge } from "@/components/ui/badge";
import { freshnessInfo, type FreshnessBucket } from "@/lib/domain/freshness";
import type { EvidenceState, Visibility } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { EVIDENCE_STATE_LABELS, VISIBILITY_LABELS } from "./labels";

/**
 * Market-module badge kit: evidence state, visibility, demo marker, freshness
 * and small status badges. Every data row in the module composes these so
 * evidence governance stays visible everywhere.
 */

const evidenceStateStyles: Record<EvidenceState, string> = {
  unverified: "border-evidence-unverified/30 bg-evidence-unverified/10 text-evidence-unverified",
  source_captured: "border-evidence-source-captured/30 bg-evidence-source-captured/10 text-evidence-source-captured",
  structurally_validated: "border-evidence-validated/30 bg-evidence-validated/10 text-evidence-validated",
  analyst_reviewed: "border-evidence-reviewed/30 bg-evidence-reviewed/10 text-evidence-reviewed",
  domain_expert_reviewed: "border-evidence-expert-reviewed/30 bg-evidence-expert-reviewed/10 text-evidence-expert-reviewed",
  superseded: "border-evidence-superseded/30 bg-evidence-superseded/10 text-evidence-superseded",
  disputed: "border-evidence-disputed/30 bg-evidence-disputed/10 text-evidence-disputed",
  expired: "border-evidence-expired/30 bg-evidence-expired/10 text-evidence-expired",
};

/** Evidence-state badge keyed by the domain enum (snake_case). */
export function EvidenceStateBadge({
  state,
  className,
}: {
  state: EvidenceState;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", evidenceStateStyles[state], className)}>
      {EVIDENCE_STATE_LABELS[state]}
    </Badge>
  );
}

/** Canonical vs tenant-private visibility marker. */
export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  if (visibility === "tenant_private") {
    return (
      <Badge variant="warning" className={cn("whitespace-nowrap", className)}>
        {VISIBILITY_LABELS.tenant_private}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("whitespace-nowrap", className)}>
      {VISIBILITY_LABELS.canonical}
    </Badge>
  );
}

/** Synthetic-demo-data marker; render nothing for real (user-created) records. */
export function DemoBadge({ isDemo, className }: { isDemo: boolean; className?: string }) {
  if (!isDemo) return null;
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap border-amber-300 bg-amber-50 text-amber-800", className)}>
      Demo
    </Badge>
  );
}

const freshnessStyles: Record<FreshnessBucket, string> = {
  fresh: "border-teal-200 bg-teal-50 text-teal-700",
  aging: "border-amber-200 bg-amber-50 text-amber-800",
  stale: "border-red-200 bg-red-50 text-red-700",
};

const freshnessLabels: Record<FreshnessBucket, string> = {
  fresh: "Fresh",
  aging: "Aging",
  stale: "Stale",
};

/** Age badge for point-in-time observations (default 90/180-day thresholds). */
export function FreshnessBadge({ date, className }: { date: string; className?: string }) {
  const info = freshnessInfo(date);
  const label =
    info.daysSince < 0
      ? `In ${-info.daysSince} d`
      : `${freshnessLabels[info.bucket]} · ${info.daysSince} d ago`;
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", freshnessStyles[info.bucket], className)}>
      {label}
    </Badge>
  );
}

type StatusTone = "success" | "warning" | "destructive" | "secondary" | "outline";

const toneVariants: Record<StatusTone, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  secondary: "secondary",
  outline: "outline",
};

/** Small generic status badge; callers map their enum to a tone + label. */
export function StatusBadge({
  label,
  tone = "secondary",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <Badge variant={toneVariants[tone]} className={cn("whitespace-nowrap", className)}>
      {label}
    </Badge>
  );
}

export type { StatusTone };
