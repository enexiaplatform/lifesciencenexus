"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DuplicateCandidate, EntityMergeEvent } from "@/lib/domain/types";

import {
  dismissCandidateAction,
  mergeEntitiesAction,
} from "@/app/(ops)/admin/entity-resolution/actions";

/**
 * Duplicate-resolution queue (client). Each candidate card offers a
 * side-by-side comparison, a merge dialog with field-level keep-left/right
 * choices (default: survivor's value), and a "not a duplicate" dismissal.
 * Merges go through repo.mergeEntities — aliases are preserved and a
 * redirect is recorded; the UI shows the resulting merge event.
 */

export interface CandidatePair {
  candidate: DuplicateCandidate;
  left: Record<string, unknown> | null;
  right: Record<string, unknown> | null;
}

/** Audit/identity fields never compared or merged via the UI. */
const COMPARE_EXCLUDED = new Set(["id", "createdAt", "updatedAt", "createdBy", "updatedBy", "archivedAt"]);

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value === "" ? "—" : value;
  return JSON.stringify(value);
}

function differingFields(left: Record<string, unknown>, right: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys]
    .filter((key) => !COMPARE_EXCLUDED.has(key))
    .filter((key) => JSON.stringify(left[key] ?? null) !== JSON.stringify(right[key] ?? null))
    .sort();
}

function nameOf(entity: Record<string, unknown> | null, fallback: string): string {
  const value = entity?.name ?? entity?.fullName ?? entity?.title ?? entity?.code ?? entity?.model;
  return typeof value === "string" ? value : fallback;
}

export function ResolutionQueue({ pairs }: { pairs: CandidatePair[] }) {
  const router = useRouter();
  const [merging, setMerging] = useState<CandidatePair | null>(null);
  const [result, setResult] = useState<{ candidateId: string; event: EntityMergeEvent } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function dismiss(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await dismissCandidateAction(id);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Dismiss failed.");
      }
    });
  }

  if (pairs.length === 0) {
    return (
      <EmptyState
        icon={GitMerge}
        title="The duplicate queue is empty — nothing to triage."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div role="alert" className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-fg">
          {error}
        </div>
      ) : null}

      {result ? (
        <div role="status" className="rounded-md border border-success-border bg-success-bg p-4 text-sm text-success-fg">
          <p className="font-medium">Merge completed</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            <li>Merge event: <code className="font-mono">{result.event.id}</code></li>
            <li>Survivor: <code className="font-mono">{result.event.survivorId}</code> · merged away: <code className="font-mono">{result.event.mergedId}</code></li>
            <li>Aliases preserved: {result.event.aliasPreservation ? "yes — the loser’s names stay findable on the survivor" : "no"}</li>
            <li>Redirect created: {result.event.redirectCreated ? `yes — ${result.event.mergedId} → ${result.event.survivorId}` : "no"}</li>
          </ul>
        </div>
      ) : null}

      {pairs.map((pair) => (
        <CandidateCard
          key={pair.candidate.id}
          pair={pair}
          isPending={isPending}
          onMerge={() => setMerging(pair)}
          onDismiss={() => dismiss(pair.candidate.id)}
        />
      ))}

      {merging ? (
        <MergeDialog
          pair={merging}
          onClose={() => setMerging(null)}
          onConfirm={(input) => {
            setError(null);
            startTransition(async () => {
              try {
                const event = await mergeEntitiesAction(input);
                setResult({ candidateId: merging.candidate.id, event });
                setMerging(null);
                router.refresh();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Merge failed.");
                setMerging(null);
              }
            });
          }}
          isPending={isPending}
        />
      ) : null}
    </div>
  );
}

function CandidateCard({
  pair,
  isPending,
  onMerge,
  onDismiss,
}: {
  pair: CandidatePair;
  isPending: boolean;
  onMerge: () => void;
  onDismiss: () => void;
}) {
  const { candidate, left, right } = pair;
  const diffs = left && right ? differingFields(left, right) : [];
  const comparableKeys = left && right
    ? [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((key) => !COMPARE_EXCLUDED.has(key)).sort()
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Badge variant="secondary">{candidate.entityType}</Badge>
            <span>{nameOf(left, candidate.leftId)}</span>
            <span className="text-slate-400">↔</span>
            <span>{nameOf(right, candidate.rightId)}</span>
            <Badge variant="warning">{Math.round(candidate.score * 100)}% match</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={onMerge} disabled={isPending || !left || !right}>
              <GitMerge className="h-4 w-4" aria-hidden="true" /> Merge…
            </Button>
            <Button size="sm" variant="outline" onClick={onDismiss} disabled={isPending}>
              <XCircle className="h-4 w-4" aria-hidden="true" /> Not a duplicate
            </Button>
          </div>
        </div>
        <CardDescription className="flex flex-wrap gap-1.5 pt-1">
          {candidate.matchedOn.map((reason) => (
            <Badge key={reason} variant="outline" className="text-[10px]">
              {reason}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>
      {left && right ? (
        <CardContent>
          <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Field</TableHead>
                  <TableHead>{nameOf(left, "Left")}</TableHead>
                  <TableHead>{nameOf(right, "Right")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparableKeys.map((key) => {
                  const differs = diffs.includes(key);
                  return (
                    <TableRow key={key} className={differs ? "bg-warning-bg/60" : undefined}>
                      <TableCell className="font-mono text-xs text-slate-500">{key}</TableCell>
                      <TableCell className={`text-xs ${differs ? "font-medium text-slate-900" : "text-slate-600"}`}>
                        {displayValue(left[key])}
                      </TableCell>
                      <TableCell className={`text-xs ${differs ? "font-medium text-slate-900" : "text-slate-600"}`}>
                        {displayValue(right[key])}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-slate-500">{diffs.length} differing field{diffs.length === 1 ? "" : "s"} highlighted.</p>
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-danger-fg">One side of this pair no longer exists — dismiss the candidate.</p>
        </CardContent>
      )}
    </Card>
  );
}

function MergeDialog({
  pair,
  onClose,
  onConfirm,
  isPending,
}: {
  pair: CandidatePair;
  onClose: () => void;
  onConfirm: (input: {
    entityType: DuplicateCandidate["entityType"];
    survivorId: string;
    mergedId: string;
    fieldChoices: Record<string, "left" | "right">;
  }) => void;
  isPending: boolean;
}) {
  const { candidate, left, right } = pair;
  const [survivorSide, setSurvivorSide] = useState<"left" | "right">("left");
  const diffs = left && right ? differingFields(left, right) : [];
  // Per differing field, which ENTITY side's value survives (default: survivor side).
  const [fieldSides, setFieldSides] = useState<Record<string, "left" | "right">>({});

  if (!left || !right) return null;

  const survivorId = survivorSide === "left" ? candidate.leftId : candidate.rightId;
  const mergedId = survivorSide === "left" ? candidate.rightId : candidate.leftId;

  function confirm() {
    // Repo convention: fieldChoices "left" = survivor, "right" = merged.
    const fieldChoices: Record<string, "left" | "right"> = {};
    for (const field of diffs) {
      const pickedSide = fieldSides[field] ?? survivorSide;
      fieldChoices[field] = pickedSide === survivorSide ? "left" : "right";
    }
    onConfirm({ entityType: candidate.entityType, survivorId, mergedId, fieldChoices });
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge duplicate {candidate.entityType} records</DialogTitle>
          <DialogDescription>
            The loser is archived, its names become aliases on the survivor (old quotes and documents
            keep resolving), and a redirect is recorded so existing links keep working.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-900">Survivor</legend>
          {(["left", "right"] as const).map((side) => {
            const entity = side === "left" ? left : right;
            return (
              <label key={side} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="survivor"
                  className="accent-navy-900"
                  checked={survivorSide === side}
                  onChange={() => setSurvivorSide(side)}
                />
                Keep <span className="font-medium">{nameOf(entity, side)}</span>
                <span className="text-xs text-slate-400">({side === "left" ? candidate.leftId : candidate.rightId})</span>
              </label>
            );
          })}
        </fieldset>

        {diffs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">
              Conflicting fields — pick which value survives
            </p>
            <div className="rounded-md border border-slate-200">
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Field</TableHead>
                    <TableHead>{nameOf(left, "Left")}</TableHead>
                    <TableHead>{nameOf(right, "Right")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffs.map((field) => {
                    const picked = fieldSides[field] ?? survivorSide;
                    return (
                      <TableRow key={field}>
                        <TableCell className="font-mono text-xs text-slate-500">{field}</TableCell>
                        {(["left", "right"] as const).map((side) => (
                          <TableCell key={side}>
                            <label className="flex items-start gap-1.5 text-xs">
                              <input
                                type="radio"
                                name={`field-${field}`}
                                className="mt-0.5 accent-navy-900"
                                checked={picked === side}
                                onChange={() => setFieldSides({ ...fieldSides, [field]: side })}
                              />
                              <span className={side === survivorSide ? "font-medium" : ""}>
                                {displayValue((side === "left" ? left : right)[field])}
                              </span>
                            </label>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No conflicting fields — the survivor’s values win everywhere.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Confirm merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
