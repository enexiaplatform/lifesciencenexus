import { Badge } from "@/components/ui/badge";
import { freshnessInfo, type FreshnessBucket } from "@/lib/domain/freshness";
import type { EvidenceState, Visibility } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { EVIDENCE_STATE_LABELS, VISIBILITY_LABELS } from "./labels";

/**
 * Market-module badge kit: evidence state, visibility, demo marker, freshness
 * and small status badges. Every badge is a thin wrapper over the canonical
 * `ui/badge` variants — this file owns labels and enum→variant mapping only.
 */

/** Evidence-state badge keyed by the domain enum (snake_case). */
export function EvidenceStateBadge({
  state,
  className,
}: {
  state: EvidenceState;
  className?: string;
}) {
  return (
    <Badge
      variant="evidence"
      state={state}
      className={cn("whitespace-nowrap", className)}
    >
      {EVIDENCE_STATE_LABELS[state]}
    </Badge>
  );
}

/** Canonical vs tenant-private visibility marker. */
export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  return (
    <Badge
      variant="visibility"
      visibility={visibility}
      className={cn("whitespace-nowrap", className)}
    >
      {VISIBILITY_LABELS[visibility]}
    </Badge>
  );
}

/** Synthetic-demo-data marker; render nothing for real (user-created) records. */
export function DemoBadge({ isDemo, className }: { isDemo: boolean; className?: string }) {
  if (!isDemo) return null;
  return (
    <Badge variant="demo" className={cn("whitespace-nowrap", className)}>
      Demo
    </Badge>
  );
}

const freshnessVariants: Record<FreshnessBucket, "success" | "warning" | "destructive"> = {
  fresh: "success",
  aging: "warning",
  stale: "destructive",
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
    <Badge variant={freshnessVariants[info.bucket]} className={cn("whitespace-nowrap", className)}>
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
