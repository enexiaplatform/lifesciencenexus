import * as React from "react";

import { cn } from "@/lib/utils";

export interface SectionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Section heading. */
  title: React.ReactNode;
  /** One-line explanation of the section's scope. */
  description?: React.ReactNode;
  /** Right-aligned header slot (filters, "view all" links). */
  actions?: React.ReactNode;
  /** Remove the default content padding (e.g. for flush tables). */
  flush?: boolean;
}

/**
 * Canonical content section: card with a consistent header
 * (title / description / actions) and padded body.
 */
export function SectionCard({
  title,
  description,
  actions,
  flush = false,
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-xs",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className={cn(!flush && "p-5")}>{children}</div>
    </section>
  );
}
