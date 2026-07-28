"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import type { SearchResult } from "@/lib/data/repository";
import type { EntityType } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import {
  addProjectEntityAction,
  removeProjectEntityAction,
  searchEntitiesForProjectAction,
} from "@/app/(research)/research/actions";
import { entityHref, entityTypeLabel } from "@/components/search/entity-routes";
import { cn } from "@/lib/utils";

export interface CollectedEntity {
  linkId: string;
  entityType: EntityType;
  entityId: string;
  title: string;
  exists: boolean;
  isDemo: boolean;
}

/** ENTITY COLLECTION panel: entities grouped by type, with add/remove. */
export function EntityCollection({
  projectId,
  entities,
}: {
  projectId: string;
  entities: CollectedEntity[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byType = new Map<EntityType, CollectedEntity[]>();
    for (const entity of entities) {
      const bucket = byType.get(entity.entityType) ?? [];
      bucket.push(entity);
      byType.set(entity.entityType, bucket);
    }
    return [...byType.entries()].sort(([a], [b]) =>
      entityTypeLabel(a).localeCompare(entityTypeLabel(b)),
    );
  }, [entities]);

  function remove(linkId: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await removeProjectEntityAction({ projectId, linkId });
      setFeedback(result.ok ? "Entity removed" : result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Entity collection</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add entity
          </Button>
        </div>
        <CardDescription className="text-xs">
          Graph entities collected as evidence scope for this question.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div aria-live="polite" className="sr-only">
          {feedback ?? ""}
        </div>
        {entities.length === 0 ? (
          <p className="text-sm text-slate-500">
            No entities collected yet — add products, SKUs, organizations or tenders in scope.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map(([type, items]) => (
              <div key={type}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {entityTypeLabel(type)} ({items.length})
                </h3>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li
                      key={item.linkId}
                      className="group flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5"
                    >
                      {item.exists ? (
                        <Link
                          href={entityHref(item.entityType, item.entityId)}
                          className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
                          {item.title}
                        </span>
                      )}
                      <IsDemoBadge isDemo={item.isDemo} />
                      <button
                        type="button"
                        onClick={() => remove(item.linkId)}
                        disabled={pending}
                        aria-label={`Remove ${item.title} from project`}
                        className="rounded-sm p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <AddEntityDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        existing={entities}
      />
    </Card>
  );
}

function AddEntityDialog({
  projectId,
  open,
  onOpenChange,
  existing,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: CollectedEntity[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const existingKeys = useMemo(
    () => new Set(existing.map((item) => `${item.entityType}:${item.entityId}`)),
    [existing],
  );

  // Debounced entity search.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(() => {
      searchEntitiesForProjectAction(trimmed)
        .then((hits) => {
          if (!cancelled) setResults(hits);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  function add(hit: SearchResult) {
    setError(null);
    startTransition(async () => {
      const result = await addProjectEntityAction({
        projectId,
        entityType: hit.entityType,
        entityId: hit.id,
      });
      if (result.ok) {
        onOpenChange(false);
        setQuery("");
        setResults([]);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add entity to project</DialogTitle>
          <DialogDescription>
            Search the graph and attach entities to this research question.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search entities…"
            aria-label="Search entities to add"
            autoFocus
          />
          <div aria-live="polite">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {searching && <p className="text-xs text-slate-500">Searching…</p>}
          </div>
          {results.length > 0 && (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {results.map((hit) => {
                const already = existingKeys.has(`${hit.entityType}:${hit.id}`);
                return (
                  <li
                    key={`${hit.entityType}:${hit.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5",
                      already ? "border-slate-100 bg-slate-50" : "border-slate-200",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{hit.title}</span>
                      <span className="block text-xs text-slate-500">
                        {entityTypeLabel(hit.entityType)}
                        {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant={already ? "ghost" : "outline"}
                      disabled={already || pending}
                      onClick={() => add(hit)}
                    >
                      {already ? "Added" : "Add"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <p className="text-sm text-slate-500">
              No matches. Try a different name, alias or catalogue number.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
