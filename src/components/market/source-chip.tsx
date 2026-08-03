import { Badge } from "@/components/ui/badge";
import type { Source } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { SOURCE_TYPE_LABELS, formatDate } from "./labels";

/**
 * Compact evidence-source chip: source type label with the full title and
 * capture date on hover/focus. Used wherever a claim, edge or tender cites
 * its backing source.
 */
export function SourceChip({
  source,
  className,
}: {
  source: Source | null | undefined;
  className?: string;
}) {
  if (!source) {
    return (
      <Badge variant="outline" className={cn("whitespace-nowrap text-slate-500", className)}>
        No source linked
      </Badge>
    );
  }
  const title = `${source.title} · captured ${formatDate(source.capturedAt)}`;
  return (
    <Badge
      variant="outline"
      title={title}
      aria-label={title}
      className={cn("max-w-56 truncate whitespace-nowrap border-nexus-200 bg-nexus-50 text-nexus-700", className)}
    >
      {SOURCE_TYPE_LABELS[source.type]}
    </Badge>
  );
}
