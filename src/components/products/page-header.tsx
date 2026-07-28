import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Standard page header: title, description, optional badges and action slot. */
export function PageHeader({
  title,
  description,
  badges,
  actions,
  className,
}: {
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {badges}
        </div>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
