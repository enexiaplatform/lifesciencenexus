import { Badge } from "@/components/ui/badge";
import type { EvidenceState, SupplierRelationshipType } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { EvidenceStateBadge } from "./badges";
import { SUPPLIER_RELATIONSHIP_LABELS } from "./labels";

/** States that count as "reviewed" for authorization claims. */
const REVIEWED_STATES: ReadonlySet<EvidenceState> = new Set(["analyst_reviewed", "domain_expert_reviewed"]);

/**
 * Supplier relationship badge with an evidence-governance rule baked in:
 * `unknown_unverified` always renders as "Unverified relationship", and an
 * `authorized_distributor` label is only shown plain when backed by an
 * analyst-reviewed (or better) claim. Otherwise it renders as an unverified
 * claim so the UI never presents authorization as established fact.
 */
export function SupplierRelationshipBadge({
  type,
  evidenceState,
  className,
}: {
  type: SupplierRelationshipType;
  /** State of the best supporting claim for this relationship, if any. */
  evidenceState?: EvidenceState;
  className?: string;
}) {
  if (type === "unknown_unverified") {
    return (
      <Badge variant="warning" className={cn("whitespace-nowrap", className)}>
        {SUPPLIER_RELATIONSHIP_LABELS.unknown_unverified}
      </Badge>
    );
  }

  const label = SUPPLIER_RELATIONSHIP_LABELS[type];
  const verified = evidenceState !== undefined && REVIEWED_STATES.has(evidenceState);

  if (type === "authorized_distributor" && !verified) {
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
        <Badge variant="warning" className="whitespace-nowrap">
          {label} — unverified claim
        </Badge>
        {evidenceState ? <EvidenceStateBadge state={evidenceState} /> : null}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <Badge variant={verified ? "success" : "secondary"} className="whitespace-nowrap">
        {label}
      </Badge>
      {evidenceState ? <EvidenceStateBadge state={evidenceState} /> : null}
    </span>
  );
}
