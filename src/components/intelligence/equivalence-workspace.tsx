"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Trash2 } from "lucide-react";

import { ClassificationBadge } from "@/components/products/badges";
import { downloadText } from "@/components/products/download";
import { humanize, ScoreBar } from "@/components/products/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  classifyEquivalence,
  scoreEquivalence,
} from "@/lib/domain/equivalence";
import { toCsv } from "@/lib/domain/export";
import {
  EQUIVALENCE_CLASSIFICATIONS,
  EQUIVALENCE_DIMENSIONS,
  type DimensionScore,
  type EquivalenceClassification,
  type EquivalenceDifference,
  type EquivalenceDimension,
  type EvidenceState,
} from "@/lib/domain/types";
import type { SaveEquivalenceInput } from "@/app/(intelligence)/equivalence/actions";
import { cn } from "@/lib/utils";

type ActionResult = { ok: true } | { ok: false; error: string };

export interface EquivalenceWorkspaceProps {
  recordId: string;
  reviewState: EvidenceState;
  lastReviewedAt: string | null;
  initialClassification: EquivalenceClassification;
  storedOverallScore: number;
  initialDimensionScores: Record<EquivalenceDimension, DimensionScore>;
  initialRationale: string;
  initialDifferences: EquivalenceDifference[];
  initialValidationConsiderations: string[];
  save: (input: SaveEquivalenceInput) => Promise<ActionResult>;
  submitForReview: (input: { id: string }) => Promise<ActionResult>;
  markReviewed: (input: { id: string }) => Promise<ActionResult>;
}

interface DimensionState {
  score: number | null;
  weight: number;
  note: string;
}

/**
 * The equivalence assessment editor: per-dimension scores/weights/notes with
 * a LIVE engine recomputation on every edit. Unknown dimensions are first
 * class (never zero), the exact-equivalent guard is explained in place, and
 * saving re-validates everything server-side.
 */
export function EquivalenceWorkspace({
  recordId,
  reviewState,
  lastReviewedAt,
  initialClassification,
  storedOverallScore,
  initialDimensionScores,
  initialRationale,
  initialDifferences,
  initialValidationConsiderations,
  save,
  submitForReview,
  markReviewed,
}: EquivalenceWorkspaceProps) {
  const router = useRouter();
  const [dimensions, setDimensions] = useState<Record<EquivalenceDimension, DimensionState>>(
    () =>
      Object.fromEntries(
        EQUIVALENCE_DIMENSIONS.map((dimension) => [
          dimension,
          {
            score: initialDimensionScores[dimension]?.score ?? null,
            weight: initialDimensionScores[dimension]?.weight ?? 0,
            note: initialDimensionScores[dimension]?.note ?? "",
          },
        ]),
      ) as Record<EquivalenceDimension, DimensionState>,
  );
  const [classification, setClassification] = useState<EquivalenceClassification>(initialClassification);
  const [rationale, setRationale] = useState(initialRationale);
  const [differences, setDifferences] = useState<EquivalenceDifference[]>(initialDifferences);
  const [considerationsText, setConsiderationsText] = useState(
    initialValidationConsiderations.join("\n"),
  );
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const weights = useMemo(
    () =>
      Object.fromEntries(
        EQUIVALENCE_DIMENSIONS.map((dimension) => [dimension, dimensions[dimension].weight]),
      ) as Record<EquivalenceDimension, number>,
    [dimensions],
  );
  const scores = useMemo(
    () =>
      Object.fromEntries(
        EQUIVALENCE_DIMENSIONS.map((dimension) => [dimension, dimensions[dimension].score]),
      ) as Record<EquivalenceDimension, number | null>,
    [dimensions],
  );

  const weightSum = EQUIVALENCE_DIMENSIONS.reduce((sum, dimension) => sum + dimensions[dimension].weight, 0);
  const weightsValid = Math.abs(weightSum - 100) < 1e-9 &&
    EQUIVALENCE_DIMENSIONS.every((dimension) => dimensions[dimension].weight >= 0);
  const scoresValid = EQUIVALENCE_DIMENSIONS.every((dimension) => {
    const score = dimensions[dimension].score;
    return score === null || (score >= 0 && score <= 100);
  });

  // Live engine recomputation — the same functions that run server-side on save.
  const result = useMemo(() => {
    if (!weightsValid || !scoresValid) return null;
    try {
      return scoreEquivalence(scores, weights);
    } catch {
      return null;
    }
  }, [weightsValid, scoresValid, scores, weights]);

  const suggestion = useMemo(() => {
    if (!result) return null;
    return classifyEquivalence(result.overallScore, scores);
  }, [result, scores]);

  const exactBlocked = (result?.unknownDimensions.length ?? 0) > 0;
  const dirty =
    classification !== initialClassification ||
    rationale !== initialRationale ||
    considerationsText !== initialValidationConsiderations.join("\n") ||
    JSON.stringify(differences) !== JSON.stringify(initialDifferences) ||
    EQUIVALENCE_DIMENSIONS.some((dimension) => {
      const initial = initialDimensionScores[dimension];
      const current = dimensions[dimension];
      return (
        (initial?.score ?? null) !== current.score ||
        (initial?.weight ?? 0) !== current.weight ||
        (initial?.note ?? "") !== current.note
      );
    });

  const setDimension = (dimension: EquivalenceDimension, patch: Partial<DimensionState>) => {
    setDimensions((current) => ({
      ...current,
      [dimension]: { ...current[dimension], ...patch },
    }));
  };

  const runAction = (action: () => Promise<ActionResult>, successText: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage({ kind: "success", text: successText });
        router.refresh();
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  const handleSave = () => {
    if (!weightsValid) {
      setMessage({ kind: "error", text: `Weights must sum to 100 (currently ${weightSum}).` });
      return;
    }
    if (!scoresValid) {
      setMessage({ kind: "error", text: "Scores must be between 0 and 100, or marked Unknown." });
      return;
    }
    const dimensionScores = Object.fromEntries(
      EQUIVALENCE_DIMENSIONS.map((dimension) => [
        dimension,
        {
          score: dimensions[dimension].score,
          weight: dimensions[dimension].weight,
          ...(dimensions[dimension].note.trim()
            ? { note: dimensions[dimension].note.trim() }
            : {}),
        },
      ]),
    ) as Record<EquivalenceDimension, DimensionScore>;
    runAction(
      () =>
        save({
          id: recordId,
          classification,
          rationale,
          differences: differences.filter((difference) => difference.description.trim() !== ""),
          validationConsiderations: considerationsText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line !== ""),
          dimensionScores,
        }),
      "Assessment saved — overall score recomputed server-side.",
    );
  };

  const exportCsv = () => {
    const rows = EQUIVALENCE_DIMENSIONS.map((dimension) => ({
      dimension,
      weight: dimensions[dimension].weight,
      score: dimensions[dimension].score,
      note: dimensions[dimension].note,
    }));
    const csv = toCsv(rows, [
      { key: "dimension", header: "Dimension", value: (row) => row.dimension },
      { key: "weight", header: "Weight %", value: (row) => row.weight },
      {
        key: "score",
        header: "Score 0-100",
        value: (row) => (row.score === null ? "UNKNOWN" : row.score),
      },
      { key: "note", header: "Note", value: (row) => row.note },
    ]);
    downloadText(`equivalence-${recordId}.csv`, csv, "text/csv");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Dimension editor</CardTitle>
          <CardDescription className="text-xs">
            Score each dimension 0–100, or mark it Unknown when there is no evidence — unknown is
            never treated as zero. Weights must sum to 100.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              weightsValid
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-red-300 bg-red-50 text-red-800",
            )}
            role={weightsValid ? undefined : "alert"}
          >
            Weight total: <span className="font-semibold tabular-nums">{weightSum}</span> / 100
            {weightsValid ? "" : " — adjust the weights before saving"}
          </div>

          <div className="space-y-2">
            {EQUIVALENCE_DIMENSIONS.map((dimension) => {
              const state = dimensions[dimension];
              const scoreId = `score-${dimension}`;
              const weightId = `weight-${dimension}`;
              const unknownId = `unknown-${dimension}`;
              const noteId = `note-${dimension}`;
              const scoreInvalid = state.score !== null && (state.score < 0 || state.score > 100);
              return (
                <div
                  key={dimension}
                  className="grid grid-cols-1 items-end gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1.4fr)_90px_110px_110px_minmax(0,1.6fr)]"
                >
                  <div>
                    <Label htmlFor={noteId} className="text-xs font-semibold text-slate-800">
                      {humanize(dimension)}
                    </Label>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      default weight {state.weight}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={weightId} className="mb-1 block text-[11px] text-slate-500">
                      Weight
                    </Label>
                    <Input
                      id={weightId}
                      type="number"
                      min={0}
                      max={100}
                      value={state.weight}
                      onChange={(event) =>
                        setDimension(dimension, { weight: Number(event.target.value) })
                      }
                      className="h-8 text-xs tabular-nums"
                      aria-label={`Weight for ${humanize(dimension)}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={scoreId} className="mb-1 block text-[11px] text-slate-500">
                      Score
                    </Label>
                    <Input
                      id={scoreId}
                      type="number"
                      min={0}
                      max={100}
                      disabled={state.score === null}
                      value={state.score ?? ""}
                      onChange={(event) =>
                        setDimension(dimension, {
                          score: event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                      aria-invalid={scoreInvalid || undefined}
                      className="h-8 text-xs tabular-nums"
                      placeholder="0–100"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      id={unknownId}
                      type="checkbox"
                      checked={state.score === null}
                      onChange={(event) =>
                        setDimension(dimension, { score: event.target.checked ? null : 50 })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                    <Label htmlFor={unknownId} className="text-xs font-normal text-slate-600">
                      Unknown
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor={noteId} className="mb-1 block text-[11px] text-slate-500">
                      Note
                    </Label>
                    <Input
                      id={noteId}
                      value={state.note}
                      onChange={(event) => setDimension(dimension, { note: event.target.value })}
                      className="h-8 text-xs"
                      placeholder="Evidence note…"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live scoring panel */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Live assessment</CardTitle>
          <CardDescription className="text-xs">
            Recomputed on every edit with the equivalence engine — the save action recomputes it
            again server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {!result ? (
            <p className="text-xs text-slate-500">
              Fix the weight total and score ranges to see the live assessment.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Overall score</p>
                  <ScoreBar score={result.overallScore} barClassName="w-24" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Unknown penalty</p>
                  <p className="text-sm font-semibold tabular-nums text-slate-800">
                    {result.unknownPenalty}% of weight unverified
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Stored score</p>
                  <p className="text-sm tabular-nums text-slate-600">{storedOverallScore.toFixed(1)}</p>
                </div>
              </div>

              {result.unknownDimensions.length > 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-600">
                  <span className="font-medium">Unknown dimensions:</span>{" "}
                  {result.unknownDimensions.map((dimension) => (
                    <Badge key={dimension} variant="outline" className="ml-1 border-dashed font-normal">
                      {humanize(dimension)}
                    </Badge>
                  ))}
                  <p className="mt-1 text-slate-500">
                    The overall score covers known dimensions only (weights renormalized). An exact
                    equivalence can never be classified while dimensions are unknown.
                  </p>
                </div>
              ) : null}

              {suggestion ? (
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Suggested classification:</span>
                    <ClassificationBadge classification={suggestion.classification} />
                  </div>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                    {suggestion.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <Label htmlFor="final-classification" className="text-xs">
                    Final classification
                  </Label>
                  <select
                    id="final-classification"
                    value={classification}
                    onChange={(event) =>
                      setClassification(event.target.value as EquivalenceClassification)
                    }
                    className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {EQUIVALENCE_CLASSIFICATIONS.map((option) => (
                      <option
                        key={option}
                        value={option}
                        disabled={option === "exact_equivalent" && exactBlocked}
                      >
                        {humanize(option)}
                        {option === "exact_equivalent" && exactBlocked
                          ? " (blocked: unknown dimensions)"
                          : ""}
                      </option>
                    ))}
                  </select>
                  {exactBlocked ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Exact equivalent is disabled: every dimension must be scored to claim it.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="rationale" className="text-xs">
                    Rationale
                  </Label>
                  <Textarea
                    id="rationale"
                    value={rationale}
                    onChange={(event) => setRationale(event.target.value)}
                    className="mt-1 min-h-[68px] text-xs"
                    placeholder="Why this classification, in one or two sentences…"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Differences + validation considerations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Key differences</CardTitle>
            <CardDescription className="text-xs">
              Documented differences a reviewer must know about
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {differences.map((difference, index) => (
              <div key={index} className="grid grid-cols-[130px_100px_minmax(0,1fr)_auto] items-center gap-2">
                <select
                  aria-label={`Dimension for difference ${index + 1}`}
                  value={difference.dimension}
                  onChange={(event) =>
                    setDifferences((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, dimension: event.target.value as EquivalenceDimension }
                          : item,
                      ),
                    )
                  }
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {EQUIVALENCE_DIMENSIONS.map((dimension) => (
                    <option key={dimension} value={dimension}>
                      {humanize(dimension)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Severity for difference ${index + 1}`}
                  value={difference.severity ?? ""}
                  onChange={(event) =>
                    setDifferences((current) =>
                      current.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              severity: event.target.value
                                ? (event.target.value as EquivalenceDifference["severity"])
                                : undefined,
                            }
                          : item,
                      ),
                    )
                  }
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">severity</option>
                  <option value="minor">minor</option>
                  <option value="moderate">moderate</option>
                  <option value="major">major</option>
                </select>
                <Input
                  aria-label={`Description for difference ${index + 1}`}
                  value={difference.description}
                  onChange={(event) =>
                    setDifferences((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, description: event.target.value } : item,
                      ),
                    )
                  }
                  className="h-8 text-xs"
                  placeholder="Describe the difference…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove difference ${index + 1}`}
                  onClick={() =>
                    setDifferences((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDifferences((current) => [
                  ...current,
                  { dimension: "formula_composition", description: "" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add difference
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Validation considerations</CardTitle>
            <CardDescription className="text-xs">
              What the customer must validate before substituting — one per line
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Textarea
              aria-label="Validation considerations, one per line"
              value={considerationsText}
              onChange={(event) => setConsiderationsText(event.target.value)}
              className="min-h-[140px] text-xs"
              placeholder={"Run growth-promotion testing with the ATCC panel\nConfirm autoclave cycle compatibility"}
            />
          </CardContent>
        </Card>
      </div>

      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-md border p-3 text-xs",
            message.kind === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-teal-300 bg-teal-50 text-teal-800",
          )}
        >
          {message.text}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleSave} disabled={pending || !weightsValid || !scoresValid}>
          {pending ? "Working…" : dirty ? "Save assessment" : "Saved"}
        </Button>
        <Button type="button" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export comparison CSV
        </Button>
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        {reviewState === "unverified" || reviewState === "source_captured" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              runAction(() => submitForReview({ id: recordId }), "Submitted for review.")
            }
          >
            Submit for review
          </Button>
        ) : null}
        {reviewState === "structurally_validated" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              runAction(() => markReviewed({ id: recordId }), "Marked analyst reviewed.")
            }
          >
            Mark analyst reviewed
          </Button>
        ) : null}
        {reviewState === "analyst_reviewed" || reviewState === "domain_expert_reviewed" ? (
          <p className="text-xs text-slate-500">
            Review complete{lastReviewedAt ? ` on ${lastReviewedAt.slice(0, 10)}` : ""}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
