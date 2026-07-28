import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Page title, rendered in the display font. */
  title: React.ReactNode;
  /** One-sentence scope statement under the title. */
  description?: React.ReactNode;
  /** Breadcrumb trail slot (render a <nav aria-label="Breadcrumb">). */
  breadcrumb?: React.ReactNode;
  /** Right-aligned actions (buttons, filters). */
  actions?: React.ReactNode;
}

/**
 * Canonical page header: breadcrumb slot, display-font title, description,
 * right-aligned actions. Use once per page, above the first section.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-3", className)} {...props}>
      {breadcrumb ? <div className="text-sm">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-display-md font-semibold text-slate-900">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
