import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { formatDate } from "./labels";

export interface TimelineEntry {
  id: string;
  /** ISO date/datetime; rendered as YYYY-MM-DD. */
  at: string;
  title: string;
  description?: string;
  /** Optional right-aligned trailing content (badges, amounts). */
  trailing?: ReactNode;
}

/**
 * Vertical event timeline (tender events, asset lifecycle / maintenance /
 * qualification history). Entries are rendered newest-first by the caller.
 */
export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  if (entries.length === 0) return null;
  return (
    <ol className={cn("relative space-y-3 border-l border-slate-200 pl-4", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-navy-400 ring-1 ring-slate-300"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">{entry.title}</p>
            <div className="flex items-center gap-2">
              {entry.trailing}
              <time dateTime={entry.at} className="text-xs text-slate-500">
                {formatDate(entry.at)}
              </time>
            </div>
          </div>
          {entry.description ? <p className="mt-0.5 text-xs text-slate-500">{entry.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}
