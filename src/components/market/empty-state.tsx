import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Empty state with a clear next action. Every list/table in the module falls
 * back to this when the repository returns zero rows.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="h-6 w-6 text-slate-400" aria-hidden="true" /> : null}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-xs text-slate-500">{description}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-1 text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
