import Link from "next/link";
import { FileText } from "lucide-react";

import type { SourceType } from "@/lib/domain/types";
import { humanize } from "@/components/search/entity-routes";
import { cn } from "@/lib/utils";

/**
 * Compact source reference chip: source type + title, linking to the sources
 * registry. Used in claim rows, findings and search results.
 */
export function SourceChip({
  type,
  title,
  className,
}: {
  type: SourceType;
  title: string;
  className?: string;
}) {
  return (
    <Link
      href="/sources"
      title={`${humanize(type)} — view sources`}
      className={cn(
        "inline-flex max-w-56 items-center gap-1.5 truncate rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <FileText className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="truncate">{title}</span>
    </Link>
  );
}
