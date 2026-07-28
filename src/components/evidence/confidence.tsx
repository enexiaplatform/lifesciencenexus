"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { aggregateConfidence } from "@/lib/domain/confidence";
import type { ConfidenceDimensions } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Human labels for the seven confidence dimensions, in stable display order. */
export const CONFIDENCE_DIMENSION_LABELS: ReadonlyArray<{
  key: keyof ConfidenceDimensions;
  label: string;
}> = [
  { key: "sourceAuthority", label: "Source authority" },
  { key: "sourceRecency", label: "Source recency" },
  { key: "entityMatch", label: "Entity match" },
  { key: "extraction", label: "Extraction" },
  { key: "technicalEquivalence", label: "Technical equivalence" },
  { key: "geographicRelevance", label: "Geographic relevance" },
  { key: "commercialRelevance", label: "Commercial relevance" },
];

function barColor(value: number): string {
  if (value < 0.5) return "bg-red-400";
  if (value < 0.75) return "bg-amber-400";
  return "bg-teal-500";
}

function pct(value: number): number {
  return Math.round(value * 100);
}

/** Aggregate confidence as a 0–100 percentage. */
export function confidencePercent(confidence: ConfidenceDimensions): number {
  return pct(aggregateConfidence(confidence));
}

/**
 * Seven mini bars (one per dimension) with a tooltip breaking down every
 * dimension plus the weighted aggregate. For dense table cells.
 */
export function ConfidenceMiniBars({
  confidence,
  className,
}: {
  confidence: ConfidenceDimensions;
  className?: string;
}) {
  const aggregate = confidencePercent(confidence);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex cursor-help items-end gap-px rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              className,
            )}
            aria-label={`Confidence ${aggregate} of 100 across 7 dimensions`}
          >
            {CONFIDENCE_DIMENSION_LABELS.map(({ key }) => (
              <span
                key={key}
                aria-hidden="true"
                className={cn("w-1 rounded-[1px]", barColor(confidence[key]))}
                style={{ height: `${Math.max(3, Math.round(confidence[key] * 14))}px` }}
              />
            ))}
            <span className="ml-1 text-xs tabular-nums text-slate-600">{aggregate}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="mb-1 font-semibold">Confidence {aggregate}/100 (weighted)</p>
          <ul className="space-y-0.5">
            {CONFIDENCE_DIMENSION_LABELS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <span>{label}</span>
                <span className="tabular-nums">{pct(confidence[key])}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Full per-dimension breakdown with labeled bars, for expanded rows/cards. */
export function ConfidenceDimensionsList({
  confidence,
  className,
}: {
  confidence: ConfidenceDimensions;
  className?: string;
}) {
  const aggregate = confidencePercent(confidence);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">Weighted aggregate</span>
        <span className="font-semibold tabular-nums text-slate-900">{aggregate}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full", barColor(aggregate / 100))}
          style={{ width: `${aggregate}%` }}
        />
      </div>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {CONFIDENCE_DIMENSION_LABELS.map(({ key, label }) => {
          const value = confidence[key];
          return (
            <li key={key} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 text-slate-600">{label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <span
                  className={cn("block h-full rounded-full", barColor(value))}
                  style={{ width: `${pct(value)}%` }}
                />
              </span>
              <span className="w-7 text-right tabular-nums text-slate-700">{pct(value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
