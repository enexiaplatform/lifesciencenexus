import { EvidenceBadge } from "@/components/evidence-badge";
import { Badge } from "@/components/ui/badge";
import type {
  AvailabilityStatus,
  ComparisonVerdict,
  EquivalenceClassification,
  EvidenceState,
  ProductCategory,
  ProductStatus,
  SignalCommercialRelevance,
  SignalStatus,
  Visibility,
} from "@/lib/domain/types";
import type { FreshnessBucket } from "@/lib/domain/freshness";
import { cn } from "@/lib/utils";

import { humanize } from "./format";

/**
 * Governance & status badges. Every data surface shows evidence state,
 * visibility and the synthetic-data marker — never present demo data as fact.
 */

type BadgeEvidenceState = Parameters<typeof EvidenceBadge>[0]["state"];

/** Domain evidence states map onto the visual lifecycle states of EvidenceBadge. */
const EVIDENCE_STATE_MAP: Record<EvidenceState, BadgeEvidenceState> = {
  unverified: "unverified",
  source_captured: "source-captured",
  structurally_validated: "validated",
  analyst_reviewed: "reviewed",
  domain_expert_reviewed: "expert-reviewed",
  superseded: "superseded",
  disputed: "disputed",
  expired: "expired",
};

export function DomainEvidenceBadge({
  state,
  className,
}: {
  state: EvidenceState;
  className?: string;
}) {
  return <EvidenceBadge state={EVIDENCE_STATE_MAP[state]} className={className} />;
}

export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  return visibility === "tenant_private" ? (
    <Badge variant="outline" className={cn("border-violet-300 bg-violet-50 text-violet-700", className)}>
      Tenant private
    </Badge>
  ) : (
    <Badge variant="outline" className={cn("border-sky-300 bg-sky-50 text-sky-700", className)}>
      Canonical
    </Badge>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={className}>
      Demo data
    </Badge>
  );
}

export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700", className)}
      title="Derived / synthetic observation — never shown as measured fact"
    >
      Synthetic
    </Badge>
  );
}

/** The standard bundle: visibility + demo marker (+ synthetic when applicable). */
export function EntityBadges({
  visibility,
  isDemo,
  isSynthetic,
  className,
}: {
  visibility: Visibility;
  isDemo: boolean;
  isSynthetic?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <VisibilityBadge visibility={visibility} />
      {isDemo ? <DemoBadge /> : null}
      {isSynthetic ? <SyntheticBadge /> : null}
    </span>
  );
}

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  if (status === "discontinued") {
    return (
      <Badge variant="outline" className={cn("border-red-300 bg-red-50 text-red-700", className)}>
        Discontinued
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge variant="outline" className={cn("border-teal-300 bg-teal-50 text-teal-700", className)}>
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("border-slate-300 bg-slate-50 text-slate-500", className)}>
      Status unknown
    </Badge>
  );
}

export function CategoryBadge({ category, className }: { category: ProductCategory; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {humanize(category)}
    </Badge>
  );
}

const AVAILABILITY_STYLES: Record<AvailabilityStatus, string> = {
  in_stock: "border-teal-300 bg-teal-50 text-teal-700",
  limited: "border-amber-300 bg-amber-50 text-amber-800",
  out_of_stock: "border-red-300 bg-red-50 text-red-700",
  unknown: "border-slate-300 bg-slate-50 text-slate-500",
};

export function AvailabilityBadge({ status, className }: { status: AvailabilityStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(AVAILABILITY_STYLES[status], className)}>
      {humanize(status)}
    </Badge>
  );
}

const FRESHNESS_STYLES: Record<FreshnessBucket, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "border-teal-300 bg-teal-50 text-teal-700" },
  aging: { label: "Aging", className: "border-amber-300 bg-amber-50 text-amber-800" },
  stale: { label: "Stale", className: "border-red-300 bg-red-50 text-red-700" },
};

export function FreshnessBadge({
  bucket,
  daysSince,
  className,
}: {
  bucket: FreshnessBucket;
  daysSince?: number;
  className?: string;
}) {
  const config = FRESHNESS_STYLES[bucket];
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
      title={daysSince !== undefined ? `Observed ${daysSince} days ago` : undefined}
    >
      {config.label}
      {daysSince !== undefined ? ` · ${daysSince}d` : ""}
    </Badge>
  );
}

const CLASSIFICATION_STYLES: Record<EquivalenceClassification, { label: string; className: string }> = {
  exact_equivalent: { label: "Exact equivalent", className: "border-teal-400 bg-teal-50 text-teal-800" },
  functional_equivalent: {
    label: "Functional equivalent",
    className: "border-blue-400 bg-blue-50 text-blue-800",
  },
  closest_alternative: { label: "Closest alternative", className: "border-amber-400 bg-amber-50 text-amber-800" },
  not_recommended_substitute: {
    label: "Not recommended",
    className: "border-red-400 bg-red-50 text-red-800",
  },
};

export function ClassificationBadge({
  classification,
  className,
}: {
  classification: EquivalenceClassification;
  className?: string;
}) {
  const config = CLASSIFICATION_STYLES[classification];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

const RELEVANCE_STYLES: Record<SignalCommercialRelevance, string> = {
  high: "border-red-300 bg-red-50 text-red-700",
  medium: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-slate-300 bg-slate-50 text-slate-600",
};

export function RelevanceBadge({
  relevance,
  className,
}: {
  relevance: SignalCommercialRelevance;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(RELEVANCE_STYLES[relevance], className)}>
      {humanize(relevance)} relevance
    </Badge>
  );
}

const SIGNAL_STATUS_STYLES: Record<SignalStatus, string> = {
  new: "border-blue-300 bg-blue-50 text-blue-700",
  acknowledged: "border-amber-300 bg-amber-50 text-amber-800",
  sent_to_memoire: "border-violet-300 bg-violet-50 text-violet-700",
  dismissed: "border-slate-300 bg-slate-50 text-slate-500",
};

export function SignalStatusBadge({ status, className }: { status: SignalStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(SIGNAL_STATUS_STYLES[status], className)}>
      {humanize(status)}
    </Badge>
  );
}

export function SignalTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {humanize(type)}
    </Badge>
  );
}

/** Comparison verdict styling — UNKNOWN is deliberately distinct from NOT MET. */
export const VERDICT_STYLES: Record<ComparisonVerdict, { label: string; className: string }> = {
  met: { label: "Met", className: "border-teal-400 bg-teal-50 text-teal-800" },
  partially_met: { label: "Partially met", className: "border-amber-400 bg-amber-50 text-amber-800" },
  not_met: { label: "Not met", className: "border-red-400 bg-red-50 text-red-800" },
  unknown: {
    label: "Unknown",
    className: "border-dashed border-slate-400 bg-white text-slate-500",
  },
};

export function VerdictBadge({ verdict, className }: { verdict: ComparisonVerdict; className?: string }) {
  const config = VERDICT_STYLES[verdict];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
