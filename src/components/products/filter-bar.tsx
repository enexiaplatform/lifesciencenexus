import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FilterSelect {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  /** Label of the "no filter" option. Defaults to 'All'. */
  anyLabel?: string;
}

/**
 * Filter bar as a native GET form: works without JavaScript, keeps every
 * control labelled and keyboard-reachable, and encodes state in the URL so
 * filtered views are shareable. Changing filters resets to page 1.
 */
export function FilterBar({
  basePath,
  query,
  selects = [],
  className,
}: {
  basePath: string;
  query?: { name?: string; label: string; placeholder?: string; value?: string };
  selects?: FilterSelect[];
  className?: string;
}) {
  const queryName = query?.name ?? "query";
  return (
    <form
      method="get"
      action={basePath}
      className={`flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 ${className ?? ""}`}
      aria-label="Filters"
    >
      {query ? (
        <div className="min-w-52 flex-1">
          <Label htmlFor={`filter-${queryName}`} className="mb-1 block text-xs">
            {query.label}
          </Label>
          <Input
            id={`filter-${queryName}`}
            name={queryName}
            type="search"
            defaultValue={query.value}
            placeholder={query.placeholder}
          />
        </div>
      ) : null}
      {selects.map((select) => (
        <div key={select.name} className="w-48">
          <Label htmlFor={`filter-${select.name}`} className="mb-1 block text-xs">
            {select.label}
          </Label>
          <select
            id={`filter-${select.name}`}
            name={select.name}
            defaultValue={select.value ?? ""}
            className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">{select.anyLabel ?? "All"}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={basePath}>Reset</Link>
        </Button>
      </div>
    </form>
  );
}
