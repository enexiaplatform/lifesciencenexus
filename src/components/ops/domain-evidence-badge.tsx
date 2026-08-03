import { Badge } from "@/components/ui/badge";
import type { EvidenceState } from "@/lib/domain/types";

/**
 * Evidence-state badge that accepts the domain's snake_case states. Thin
 * wrapper over the canonical `ui/badge` evidence variant; owns labels only.
 */
const STATE_LABELS: Record<EvidenceState, string> = {
  unverified: "Unverified",
  source_captured: "Source captured",
  structurally_validated: "Validated",
  analyst_reviewed: "Reviewed",
  domain_expert_reviewed: "Expert reviewed",
  superseded: "Superseded",
  disputed: "Disputed",
  expired: "Expired",
};

export function DomainEvidenceBadge({ state, className }: { state: EvidenceState; className?: string }) {
  return (
    <Badge variant="evidence" state={state} className={className}>
      {STATE_LABELS[state]}
    </Badge>
  );
}
