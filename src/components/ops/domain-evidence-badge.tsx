import { EvidenceBadge, type EvidenceState as BadgeState } from "@/components/evidence-badge";
import type { EvidenceState } from "@/lib/domain/types";

/** Domain evidence states (snake_case) -> EvidenceBadge states (dash-case). */
const STATE_MAP: Record<EvidenceState, BadgeState> = {
  unverified: "unverified",
  source_captured: "source-captured",
  structurally_validated: "validated",
  analyst_reviewed: "reviewed",
  domain_expert_reviewed: "expert-reviewed",
  superseded: "superseded",
  disputed: "disputed",
  expired: "expired",
};

/** EvidenceBadge that accepts the domain's snake_case evidence states. */
export function DomainEvidenceBadge({ state, className }: { state: EvidenceState; className?: string }) {
  return <EvidenceBadge state={STATE_MAP[state]} className={className} />;
}
