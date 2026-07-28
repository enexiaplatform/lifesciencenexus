import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Link-based pagination for server-rendered list pages. Preserves the current
 * query string and only rewrites `page`.
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  searchParams,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Current search params (already flattened to strings). */
  searchParams: Record<string, string>;
  className?: string;
}) {
  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams);
    if (target > 1) {
      params.set("page", String(target));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const linkClass = (disabled: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm",
      disabled
        ? "pointer-events-none opacity-40"
        : "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    );

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600", className)}>
      <p>
        Showing <span className="font-medium text-slate-800">{from}</span>–
        <span className="font-medium text-slate-800">{to}</span> of{" "}
        <span className="font-medium text-slate-800">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(page - 1)}
          aria-disabled={page <= 1}
          aria-label="Previous page"
          className={linkClass(page <= 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Previous
        </Link>
        <span aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={page >= totalPages}
          aria-label="Next page"
          className={linkClass(page >= totalPages)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
