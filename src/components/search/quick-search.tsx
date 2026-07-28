"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import type { SearchResult } from "@/lib/data/repository";
import { Input } from "@/components/ui/input";
import { quickSearchAction } from "@/components/search/actions";
import { entityHref, entityTypeLabel } from "@/components/search/entity-routes";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { cn } from "@/lib/utils";

/**
 * Topbar quick-search: debounced live preview (top 8 matches via a server
 * action) with full keyboard support. Enter opens the highlighted hit or
 * submits to /search; Escape closes the dropdown.
 */
export function QuickSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounced server-action search.
  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      quickSearchAction(trimmed)
        .then((hits) => {
          if (cancelled) return;
          setResults(hits);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function openHit(index: number) {
    const hit = results[index];
    if (!hit) return;
    setOpen(false);
    setValue("");
    setResults([]);
    router.push(entityHref(hit.entityType, hit.id));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && results.length > 0) setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0) {
        openHit(activeIndex);
      } else {
        submit();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (open) {
        setOpen(false);
      } else {
        setValue("");
      }
    }
  }

  const showDropdown = open && value.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (results.length > 0 && value.trim()) setOpen(true);
        }}
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="quick-search-results"
        aria-activedescendant={
          showDropdown && activeIndex >= 0 ? `quick-search-result-${activeIndex}` : undefined
        }
        aria-label="Quick search"
        placeholder="Quick search…"
        className="h-9 pl-8 text-sm"
      />
      {showDropdown && (
        <div
          id="quick-search-results"
          role="listbox"
          aria-label="Quick search results"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-500">
              No matches — press Enter for the full search page.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((hit, index) => (
                <li
                  key={`${hit.entityType}:${hit.id}`}
                  id={`quick-search-result-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                >
                  <button
                    type="button"
                    // onMouseDown fires before the input blur closes the list.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      openHit(index);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none",
                      index === activeIndex ? "bg-accent/10" : "bg-white",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-900">{hit.title}</span>
                      {hit.subtitle && (
                        <span className="block truncate text-xs text-slate-500">
                          {hit.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {entityTypeLabel(hit.entityType)}
                    </span>
                    <IsDemoBadge isDemo={hit.isDemo} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              submit();
            }}
            className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/5 focus-visible:outline-none"
          >
            <span>See all results for “{value.trim()}”</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-500">
              Enter
            </kbd>
          </button>
        </div>
      )}
    </div>
  );
}
