import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const evidenceStates = {
  unverified: {
    label: "Unverified",
    className:
      "border-evidence-unverified/30 bg-evidence-unverified/10 text-evidence-unverified",
  },
  "source-captured": {
    label: "Source captured",
    className:
      "border-evidence-source-captured/30 bg-evidence-source-captured/10 text-evidence-source-captured",
  },
  validated: {
    label: "Validated",
    className:
      "border-evidence-validated/30 bg-evidence-validated/10 text-evidence-validated",
  },
  reviewed: {
    label: "Reviewed",
    className:
      "border-evidence-reviewed/30 bg-evidence-reviewed/10 text-evidence-reviewed",
  },
  "expert-reviewed": {
    label: "Expert reviewed",
    className:
      "border-evidence-expert-reviewed/30 bg-evidence-expert-reviewed/10 text-evidence-expert-reviewed",
  },
  superseded: {
    label: "Superseded",
    className:
      "border-evidence-superseded/30 bg-evidence-superseded/10 text-evidence-superseded",
  },
  disputed: {
    label: "Disputed",
    className:
      "border-evidence-disputed/30 bg-evidence-disputed/10 text-evidence-disputed",
  },
  expired: {
    label: "Expired",
    className:
      "border-evidence-expired/30 bg-evidence-expired/10 text-evidence-expired",
  },
} as const;

export type EvidenceState = keyof typeof evidenceStates;

export function EvidenceBadge({
  state,
  className,
}: {
  state: EvidenceState;
  className?: string;
}) {
  const config = evidenceStates[state];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
