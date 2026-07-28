import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusDotVariants = cva(
  "inline-block size-2 shrink-0 rounded-full",
  {
    variants: {
      tone: {
        default: "bg-slate-400",
        success: "bg-success",
        warning: "bg-warning",
        danger: "bg-danger",
        info: "bg-info",
        demo: "bg-demo",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  /** Accessible label for the status (announced instead of the dot). */
  label?: string;
}

/**
 * Inline status indicator. Color never stands alone — pair with text, or
 * pass `label` so assistive tech gets the status as words.
 */
export function StatusDot({
  tone,
  label,
  className,
  ...props
}: StatusDotProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(statusDotVariants({ tone }), className)}
      {...props}
    />
  );
}

export { statusDotVariants };
