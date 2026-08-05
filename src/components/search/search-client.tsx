"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Save, Search, X } from "lucide-react";

import type { SearchResult } from "@/lib/data/repository";
import type { EntityType, Visibility } from "@/lib/domain/types";
import { CATEGORY_INFO, categoryHref, type CategoryMatch } from "@/components/products/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { IsDemoBadge, VisibilityBadge } from "@/components/evidence/meta-badges";
import {
  entityHref,
  entityTypeLabel,
  SEARCH_FACETS,
} from "@/components/search/entity-routes";
import { cn } from "@/lib/utils";

const RECENT_KEY = "nexus.search.recent.v1";
const SAVED_KEY = "nexus.search.saved.v1";
const MAX_RECENT = 8;

type VisibilityFilter = Visibility | "all";

interface SavedSearch {
  id: string;
  name: string;
  q: string;
  types: EntityType[];
  visibility: VisibilityFilter;
}

function buildUrl(q: string, types: EntityType[], visibility: VisibilityFilter): string {
  const params = new URLSearchParams();
  const trimmed = q.trim();
  if (trimmed) params.set("q", trimmed);
  if (types.length > 0) params.set("types", types.join(","));
  if (visibility !== "all") params.set("visibility", visibility);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function SearchClient({
  query,
  selectedTypes,
  visibility,
  results,
  categoryMatches = [],
}: {
  query: string;
  selectedTypes: EntityType[];
  visibility: VisibilityFilter;
  results: SearchResult[];
  categoryMatches?: CategoryMatch[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [namingOpen, setNamingOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Load persisted searches once on mount (localStorage is client-only).
  useEffect(() => {
    setRecent(readJson<string[]>(RECENT_KEY, []));
    setSaved(readJson<SavedSearch[]>(SAVED_KEY, []));
  }, []);

  // Keep the input in sync with the URL when the user is not typing in it
  // (browser back/forward, facet clicks from saved searches, etc.).
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(query);
    }
  }, [query]);

  // Debounced URL sync: typing re-runs the server search via ?q=.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (value.trim() !== query) {
        router.replace(buildUrl(value, selectedTypes, visibility), { scroll: false });
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [value, query, selectedTypes, visibility, router]);

  // Reset keyboard selection whenever the result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // "/" focuses the search input from anywhere in the app.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const recordRecent = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setRecent((current) => {
      const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // storage full / unavailable — recent searches are best-effort
      }
      return next;
    });
  }, []);

  const applySearch = useCallback(
    (q: string, types: EntityType[], vis: VisibilityFilter) => {
      setValue(q);
      router.replace(buildUrl(q, types, vis), { scroll: false });
      inputRef.current?.focus();
    },
    [router],
  );

  const toggleType = useCallback(
    (type: EntityType) => {
      const next = selectedTypes.includes(type)
        ? selectedTypes.filter((item) => item !== type)
        : [...selectedTypes, type];
      router.replace(buildUrl(value, next, visibility), { scroll: false });
    },
    [router, value, selectedTypes, visibility],
  );

  const setVisibilityFilter = useCallback(
    (next: VisibilityFilter) => {
      router.replace(buildUrl(value, selectedTypes, next), { scroll: false });
    },
    [router, value, selectedTypes],
  );

  const saveCurrentSearch = useCallback(() => {
    const name = saveName.trim() || value.trim();
    if (!name) return;
    const entry: SavedSearch = {
      id: `saved-${Date.now()}`,
      name,
      q: value.trim(),
      types: selectedTypes,
      visibility,
    };
    setSaved((current) => {
      const next = [entry, ...current].slice(0, 20);
      try {
        window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        // best-effort persistence
      }
      return next;
    });
    setSaveName("");
    setNamingOpen(false);
  }, [saveName, value, selectedTypes, visibility]);

  const deleteSavedSearch = useCallback((id: string) => {
    setSaved((current) => {
      const next = current.filter((item) => item.id !== id);
      try {
        window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        // best-effort persistence
      }
      return next;
    });
  }, []);

  // Group results by entity type in facet order for display, while keeping a
  // flat index for keyboard navigation.
  const groups = useMemo(() => {
    const byType = new Map<EntityType, Array<{ result: SearchResult; index: number }>>();
    results.forEach((result, index) => {
      const bucket = byType.get(result.entityType) ?? [];
      bucket.push({ result, index });
      byType.set(result.entityType, bucket);
    });
    const facetOrder = SEARCH_FACETS.map((facet) => facet.type);
    const ordered = [...byType.entries()].sort(([a], [b]) => {
      const ai = facetOrder.indexOf(a);
      const bi = facetOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return ordered;
  }, [results]);

  const openResult = useCallback(
    (index: number) => {
      const hit = results[index];
      if (!hit) return;
      recordRecent(value);
      router.push(entityHref(hit.entityType, hit.id));
    },
    [results, router, recordRecent, value],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) {
        openResult(activeIndex);
      } else {
        recordRecent(value);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setValue("");
    }
  }

  // Scroll the keyboard-active row into view.
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`search-result-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const hasQuery = query.length > 0;
  const canSave = value.trim().length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Search"
        description="Federated search across the whole intelligence graph — entities, evidence and research."
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onInputKeyDown}
          autoFocus
          type="search"
          role="combobox"
          aria-expanded={hasQuery && results.length > 0}
          aria-controls="search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          aria-label="Search the Nexus graph"
          placeholder="Search organizations, SKUs, catalogue numbers, tenders, sources, research…  ( / )"
          className="h-12 pl-10 text-base"
        />
      </div>

      {/* Entity-type facets */}
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Entity type filters">
        <FacetChip
          label="All"
          pressed={selectedTypes.length === 0}
          onClick={() => router.replace(buildUrl(value, [], visibility), { scroll: false })}
        />
        {SEARCH_FACETS.map((facet) => (
          <FacetChip
            key={facet.type}
            label={facet.label}
            pressed={selectedTypes.includes(facet.type)}
            onClick={() => toggleType(facet.type)}
          />
        ))}
      </div>

      {/* Visibility facet */}
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Visibility filters">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Visibility
        </span>
        <FacetChip label="All" pressed={visibility === "all"} onClick={() => setVisibilityFilter("all")} />
        <FacetChip
          label="Canonical"
          pressed={visibility === "canonical"}
          onClick={() => setVisibilityFilter("canonical")}
        />
        <FacetChip
          label="Tenant private"
          pressed={visibility === "tenant_private"}
          onClick={() => setVisibilityFilter("tenant_private")}
        />
      </div>

      {/* Recent + saved searches */}
      {(recent.length > 0 || saved.length > 0 || canSave) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Clock className="h-3 w-3" aria-hidden="true" /> Recent
              </span>
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applySearch(item, [], "all")}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {saved.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Save className="h-3 w-3" aria-hidden="true" /> Saved
              </span>
            )}
            {saved.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50 pl-2.5 pr-1 py-0.5 text-xs text-navy-700"
              >
                <button
                  type="button"
                  onClick={() => applySearch(item.q, item.types, item.visibility)}
                  className="hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={`Run saved search "${item.name}"`}
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedSearch(item.id)}
                  aria-label={`Delete saved search ${item.name}`}
                  className="rounded-full p-0.5 text-navy-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {canSave && !namingOpen && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNamingOpen(true)}
                className="h-7"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Save this search
              </Button>
            )}
            {namingOpen && (
              <span className="inline-flex items-center gap-1">
                <Input
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveCurrentSearch();
                    }
                    if (event.key === "Escape") setNamingOpen(false);
                  }}
                  placeholder="Name this search"
                  aria-label="Name this search"
                  className="h-7 w-44 text-xs"
                  autoFocus
                />
                <Button type="button" size="sm" className="h-7" onClick={saveCurrentSearch}>
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => setNamingOpen(false)}
                >
                  Cancel
                </Button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div aria-live="polite">
        {hasQuery && (
          <p className="mb-3 text-sm text-slate-600">
            {results.length === 0
              ? `No results for “${query}”.`
              : `${results.length} result${results.length === 1 ? "" : "s"} for “${query}” — use ↑ ↓ and Enter to open.`}
          </p>
        )}

        {!hasQuery && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Start typing to search across organizations, products, SKUs, tenders, installed
              assets, sources and research projects. Press{" "}
              <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs">
                /
              </kbd>{" "}
              anywhere to jump here.
            </CardContent>
          </Card>
        )}

        {hasQuery && results.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-slate-700">Nothing matched. Tips:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Try an alias, abbreviation or catalogue number (e.g. a SKU code).</li>
                <li>Remove entity-type or visibility filters above.</li>
                <li>Search for a standard by its code (“11133”) or an organism by strain (“ATCC”).</li>
                <li>Sources and research projects are searchable by title too.</li>
              </ul>
            </CardContent>
          </Card>
        )}

        <div id="search-results" role="listbox" aria-label="Search results" className="space-y-5">
          {hasQuery && categoryMatches.length > 0 && (
            <section aria-label="Matching categories">
              <h2 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Categories
                <Badge variant="secondary" className="text-[10px]">
                  {categoryMatches.length}
                </Badge>
              </h2>
              <ul className="divide-y divide-slate-100 rounded-lg border border-accent/30 bg-accent/5">
                {categoryMatches.map((match) => {
                  const info = CATEGORY_INFO[match.category];
                  return (
                    <li key={match.category}>
                      <Link
                        href={categoryHref(match.category)}
                        onClick={() => recordRecent(query)}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {info.label}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {info.description}
                          </span>
                        </span>
                        <Badge variant="secondary" className="max-w-44 truncate text-[10px] font-normal" title={`Matched: ${match.matchedOn}`}>
                          category match: {match.matchedOn}
                        </Badge>
                        <span className="text-xs font-medium text-accent">Browse brands &amp; models →</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {groups.map(([type, items]) => (
            <section key={type}>
              <h2 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {entityTypeLabel(type)}
                <Badge variant="secondary" className="text-[10px]">
                  {items.length}
                </Badge>
              </h2>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {items.map(({ result, index }) => {
                  const href = entityHref(result.entityType, result.id);
                  const active = index === activeIndex;
                  return (
                    <li
                      key={`${result.entityType}:${result.id}`}
                      id={`search-result-${index}`}
                      role="option"
                      aria-selected={active}
                    >
                      <Link
                        href={href}
                        onClick={() => recordRecent(query)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                          active && "bg-accent/5",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-slate-500">
                              {result.subtitle}
                            </span>
                          )}
                        </span>
                        {result.matchReasons.slice(0, 3).map((reason) => (
                          <Badge
                            key={reason}
                            variant="secondary"
                            className="max-w-44 truncate text-[10px] font-normal"
                            title={`Matched: ${reason}`}
                          >
                            {reason}
                          </Badge>
                        ))}
                        <VisibilityBadge visibility={result.visibility} />
                        <IsDemoBadge isDemo={result.isDemo} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function FacetChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        pressed
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
      )}
    >
      {label}
    </button>
  );
}
