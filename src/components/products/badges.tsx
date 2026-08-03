import { Badge, type BadgeProps } from "@/components/ui/badge";
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
 * Governance & status badges. Every badge is a thin wrapper over the canonical
 * `ui/badge` variants (evidence / visibility / demo / status triples) — this
 * file owns labels and enum→variant mapping only, no color classes.
 */

const EVIDENCE_STATE_LABELS: Record<EvidenceState, string> = {
  unverified: "Unverified",
  source_captured: "Source captured",
  structurally_validated: "Validated",
  analyst_reviewed: "Reviewed",
  domain_expert_reviewed: "Expert reviewed",
  superseded: "Superseded",
  disputed: "Disputed",
  expired: "Expired",
};

export function DomainEvidenceBadge({
  state,
  className,
}: {
  state: EvidenceState;
  className?: string;
}) {
  return (
    <Badge variant="evidence" state={state} className={className}>
      {EVIDENCE_STATE_LABELS[state]}
    </Badge>
  );
}

export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  return (
    <Badge variant="visibility" visibility={visibility} className={className}>
      {visibility === "tenant_private" ? "Tenant private" : "Canonical"}
    </Badge>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="demo" className={className}>
      Demo data
    </Badge>
  );
}

export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="demo"
      className={className}
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

const PRODUCT_STATUS_VARIANTS: Record<ProductStatus, { label: string; variant: BadgeProps["variant"] }> = {
  active: { label: "Active", variant: "success" },
  discontinued: { label: "Discontinued", variant: "destructive" },
  unknown: { label: "Status unknown", variant: "secondary" },
};

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const config = PRODUCT_STATUS_VARIANTS[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
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

const AVAILABILITY_VARIANTS: Record<AvailabilityStatus, BadgeProps["variant"]> = {
  in_stock: "success",
  limited: "warning",
  out_of_stock: "destructive",
  unknown: "secondary",
};

export function AvailabilityBadge({ status, className }: { status: AvailabilityStatus; className?: string }) {
  return (
    <Badge variant={AVAILABILITY_VARIANTS[status]} className={className}>
      {humanize(status)}
    </Badge>
  );
}

const FRESHNESS_VARIANTS: Record<FreshnessBucket, { label: string; variant: BadgeProps["variant"] }> = {
  fresh: { label: "Fresh", variant: "success" },
  aging: { label: "Aging", variant: "warning" },
  stale: { label: "Stale", variant: "destructive" },
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
  const config = FRESHNESS_VARIANTS[bucket];
  return (
    <Badge
      variant={config.variant}
      className={className}
      title={daysSince !== undefined ? `Observed ${daysSince} days ago` : undefined}
    >
      {config.label}
      {daysSince !== undefined ? ` · ${daysSince}d` : ""}
    </Badge>
  );
}

const CLASSIFICATION_VARIANTS: Record<EquivalenceClassification, { label: string; variant: BadgeProps["variant"] }> = {
  exact_equivalent: { label: "Exact equivalent", variant: "success" },
  functional_equivalent: { label: "Functional equivalent", variant: "info" },
  closest_alternative: { label: "Closest alternative", variant: "warning" },
  not_recommended_substitute: { label: "Not recommended", variant: "destructive" },
};

export function ClassificationBadge({
  classification,
  className,
}: {
  classification: EquivalenceClassification;
  className?: string;
}) {
  const config = CLASSIFICATION_VARIANTS[classification];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

const RELEVANCE_VARIANTS: Record<SignalCommercialRelevance, BadgeProps["variant"]> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function RelevanceBadge({
  relevance,
  className,
}: {
  relevance: SignalCommercialRelevance;
  className?: string;
}) {
  return (
    <Badge variant={RELEVANCE_VARIANTS[relevance]} className={className}>
      {humanize(relevance)} relevance
    </Badge>
  );
}

const SIGNAL_STATUS_VARIANTS: Record<SignalStatus, BadgeProps["variant"]> = {
  new: "info",
  acknowledged: "warning",
  sent_to_memoire: "secondary",
  dismissed: "outline",
};

export function SignalStatusBadge({ status, className }: { status: SignalStatus; className?: string }) {
  return (
    <Badge variant={SIGNAL_STATUS_VARIANTS[status]} className={className}>
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
export const VERDICT_STYLES: Record<
  ComparisonVerdict,
  { label: string; variant: BadgeProps["variant"]; className?: string }
> = {
  met: { label: "Met", variant: "success" },
  partially_met: { label: "Partially met", variant: "warning" },
  not_met: { label: "Not met", variant: "destructive" },
  unknown: { label: "Unknown", variant: "outline", className: "border-dashed" },
};

export function VerdictBadge({ verdict, className }: { verdict: ComparisonVerdict; className?: string }) {
  const config = VERDICT_STYLES[verdict];
  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
