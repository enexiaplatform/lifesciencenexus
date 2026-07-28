import { Badge } from "@/components/ui/badge";
import type { EvidenceState } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Badge for the eight domain evidence states, using the evidence-* theme
 * tokens. Distinct from `src/components/evidence-badge.tsx` (which uses
 * shortened keys); this one takes the domain `EvidenceState` directly.
 */
const STATE_STYLES: Record<EvidenceState, { label: string; className: string }> = {
  unverified: {
    label: "Unverified",
    className: "border-evidence-unverified/40 bg-evidence-unverified/10 text-evidence-unverified",
  },
  source_captured: {
    label: "Source captured",
    className: "border-evidence-source-captured/40 bg-evidence-source-captured/10 text-evidence-source-captured",
  },
  structurally_validated: {
    label: "Structurally validated",
    className: "border-evidence-validated/40 bg-evidence-validated/10 text-evidence-validated",
  },
  analyst_reviewed: {
    label: "Analyst reviewed",
    className: "border-evidence-reviewed/40 bg-evidence-reviewed/10 text-evidence-reviewed",
  },
  domain_expert_reviewed: {
    label: "Expert reviewed",
    className: "border-evidence-expert-reviewed/40 bg-evidence-expert-reviewed/10 text-evidence-expert-reviewed",
  },
  superseded: {
    label: "Superseded",
    className: "border-evidence-superseded/40 bg-evidence-superseded/10 text-evidence-superseded",
  },
  disputed: {
    label: "Disputed",
    className: "border-evidence-disputed/40 bg-evidence-disputed/10 text-evidence-disputed",
  },
  expired: {
    label: "Expired",
    className: "border-evidence-expired/40 bg-evidence-expired/10 text-evidence-expired",
  },
};

export function EvidenceStateBadge({
  state,
  className,
}: {
  state: EvidenceState;
  className?: string;
}) {
  const style = STATE_STYLES[state];
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", style.className, className)}>
      {style.label}
    </Badge>
  );
}
