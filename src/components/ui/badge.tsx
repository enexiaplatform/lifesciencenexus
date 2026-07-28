import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy-900 text-white",
        secondary: "border-transparent bg-slate-100 text-slate-700",
        outline: "border-slate-300 text-slate-700",
        destructive: "border-transparent bg-red-600 text-white",
        success: "border-success-border bg-success-bg text-success-fg",
        warning: "border-warning-border bg-warning-bg text-warning-fg",
        info: "border-info-border bg-info-bg text-info-fg",
        /** Evidence lifecycle state — pair with the `state` prop. */
        evidence: "",
        /** Data visibility — pair with the `visibility` prop. */
        visibility: "",
        /** Marks tenant/demo-only data. */
        demo: "border-demo-border bg-demo-bg text-demo-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** The eight domain evidence lifecycle states (docs/DESIGN_SYSTEM.md). */
export type EvidenceBadgeState =
  | "unverified"
  | "source_captured"
  | "structurally_validated"
  | "analyst_reviewed"
  | "domain_expert_reviewed"
  | "superseded"
  | "disputed"
  | "expired";

/** AA-verified bg/fg/border pairs per evidence state. */
const EVIDENCE_STATE_CLASSES: Record<EvidenceBadgeState, string> = {
  unverified:
    "border-evidence-unverified-border bg-evidence-unverified-bg text-evidence-unverified-fg",
  source_captured:
    "border-evidence-source-captured-border bg-evidence-source-captured-bg text-evidence-source-captured-fg",
  structurally_validated:
    "border-evidence-validated-border bg-evidence-validated-bg text-evidence-validated-fg",
  analyst_reviewed:
    "border-evidence-reviewed-border bg-evidence-reviewed-bg text-evidence-reviewed-fg",
  domain_expert_reviewed:
    "border-evidence-expert-reviewed-border bg-evidence-expert-reviewed-bg text-evidence-expert-reviewed-fg",
  superseded:
    "border-evidence-superseded-border bg-evidence-superseded-bg text-evidence-superseded-fg",
  disputed:
    "border-evidence-disputed-border bg-evidence-disputed-bg text-evidence-disputed-fg",
  expired:
    "border-evidence-expired-border bg-evidence-expired-bg text-evidence-expired-fg",
};

export type VisibilityBadgeState = "canonical" | "tenant_private";

const VISIBILITY_STATE_CLASSES: Record<VisibilityBadgeState, string> = {
  canonical:
    "border-visibility-canonical-border bg-visibility-canonical-bg text-visibility-canonical-fg",
  tenant_private:
    "border-visibility-private-border bg-visibility-private-bg text-visibility-private-fg",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Required when `variant="evidence"`. */
  state?: EvidenceBadgeState;
  /** Required when `variant="visibility"`. Defaults to "canonical". */
  visibility?: VisibilityBadgeState;
}

function Badge({ className, variant, state, visibility, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        variant === "evidence" &&
          EVIDENCE_STATE_CLASSES[state ?? "unverified"],
        variant === "visibility" &&
          VISIBILITY_STATE_CLASSES[visibility ?? "canonical"],
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
