import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { humanize } from "./format";

/**
 * Compact provenance chip: which source backs a value. Rendered wherever an
 * evidence-carrying record is shown so no claim appears source-less.
 */
export function SourceChip({
  sourceId,
  title,
  type,
  className,
}: {
  sourceId: string | undefined;
  /** Resolved source title, when the caller could look it up. */
  title?: string | null;
  /** Source type (e.g. 'manufacturer_catalogue') for extra context. */
  type?: string | null;
  className?: string;
}) {
  if (!sourceId) {
    return (
      <Badge
        variant="outline"
        className={cn("border-dashed border-slate-300 font-normal text-slate-400", className)}
      >
        No source
      </Badge>
    );
  }
  const label = title ?? sourceId;
  return (
    <Badge
      variant="outline"
      className={cn("max-w-56 truncate border-slate-300 bg-slate-50 font-normal text-slate-600", className)}
      title={type ? `${label} — ${humanize(type)}` : label}
    >
      <span className="truncate">{label}</span>
    </Badge>
  );
}
