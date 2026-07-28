import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * GET-form filter bar for server-rendered lists. Every control is a labelled
 * native element, so filtering works without client JavaScript and stays
 * keyboard/screen-reader friendly. Submitting resets `page` to 1.
 */
export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form method="get" className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
      <Button type="submit" size="sm" variant="secondary">
        Apply filters
      </Button>
    </form>
  );
}

/** Labelled text search input bound to the `query` search param. */
export function FilterQuery({
  value,
  placeholder = "Search…",
  label = "Search",
}: {
  value: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="w-64 max-w-full space-y-1">
      <Label htmlFor="filter-query" className="text-xs">
        {label}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        <Input
          id="filter-query"
          name="query"
          type="search"
          defaultValue={value}
          placeholder={placeholder}
          className="h-8 pl-8 text-xs"
        />
      </div>
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

/** Labelled native select bound to a search param; "" means "no filter". */
export function FilterSelect({
  name,
  label,
  value,
  options,
  allLabel = "All",
}: {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
  allLabel?: string;
}) {
  const id = `filter-${name}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
