import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/** Empty state for filtered tables and panels with no data. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <Inbox className="h-6 w-6 text-slate-300" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-xs text-slate-500">{description}</p> : null}
      {action}
    </div>
  );
}
