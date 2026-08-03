import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Server-safe pagination: plain links that merge the current filter params
 * with the target page. Rendered below dense tables.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  pageSize,
  params = {},
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Current filter params to preserve across pages. */
  params?: Record<string, string | undefined>;
}) {
  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 pt-3"
      aria-label="Pagination"
    >
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium tabular-nums text-slate-700">{from}</span>–
        <span className="font-medium tabular-nums text-slate-700">{to}</span> of{" "}
        <span className="font-medium tabular-nums text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(page - 1)} rel="prev">
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        <span className="text-xs tabular-nums text-slate-500">
          Page {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(page + 1)} rel="next">
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}
