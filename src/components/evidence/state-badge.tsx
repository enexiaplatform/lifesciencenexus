import { Badge } from "@/components/ui/badge";
import type { EvidenceState } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Badge for the eight domain evidence states. Thin wrapper over the canonical
 * `ui/badge` evidence variant (AA-verified bg/fg/border triples) — this file
 * only owns the domain-enum labels.
 */
const STATE_LABELS: Record<EvidenceState, string> = {
  unverified: "Unverified",
  source_captured: "Source captured",
  structurally_validated: "Structurally validated",
  analyst_reviewed: "Analyst reviewed",
  domain_expert_reviewed: "Expert reviewed",
  superseded: "Superseded",
  disputed: "Disputed",
  expired: "Expired",
};

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
      {STATE_LABELS[state]}
    </Badge>
  );
}
