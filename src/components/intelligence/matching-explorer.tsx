"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

import { AvailabilityBadge, ProductStatusBadge } from "@/components/products/badges";
import { formatMoney } from "@/components/products/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import {
  matchProducts,
  type MatchCandidate,
  type MatchRequirements,
  type ProductMatchResult,
} from "@/lib/domain/matching";
import type { AvailabilityStatus, Product, ProductStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
}

export interface MatchingOptions {
  industries: Option[];
  applications: Option[];
  methods: Option[];
  standards: Option[];
  sampleTypes: Option[];
  organisms: Option[];
  formats: Option[];
  countries: string[];
  storages: string[];
}

export interface SkuExtra {
  id: string;
  name: string;
  status: ProductStatus;
  latestPrice: { amount: number; currency: string; date: string } | null;
  availability: string[];
  listingCount: number;
}

export interface MatchingCandidateProps extends MatchCandidate {
  product: Product;
  extras: SkuExtra[];
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="rounded-md border border-slate-200 p-3">
      <legend className="px-1 text-xs font-semibold text-slate-700">{legend}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.has(option.id)}
              onChange={() => onToggle(option.id)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Guided matching form. Runs the deterministic matchProducts engine locally
 * on submit and renders every result with matched / missing / conflicting
 * dimensions so the ranking is fully explainable.
 */
export function MatchingExplorer({
  options,
  candidates,
}: {
  options: MatchingOptions;
  candidates: MatchingCandidateProps[];
}) {
  const [industry, setIndustry] = useState("");
  const [applicationIds, setApplicationIds] = useState<Set<string>>(new Set());
  const [methodIds, setMethodIds] = useState<Set<string>>(new Set());
  const [standardIds, setStandardIds] = useState<Set<string>>(new Set());
  const [sampleTypeIds, setSampleTypeIds] = useState<Set<string>>(new Set());
  const [organismIds, setOrganismIds] = useState<Set<string>>(new Set());
  const [requiredFormat, setRequiredFormat] = useState("");
  const [storage, setStorage] = useState("");
  const [country, setCountry] = useState("");
  const [minShelfLife, setMinShelfLife] = useState("");
  const [results, setResults] = useState<ProductMatchResult[] | null>(null);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  // id → display label, used to prettify the engine's dimension labels.
  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of [
      options.industries,
      options.applications,
      options.methods,
      options.standards,
      options.sampleTypes,
      options.organisms,
      options.formats,
    ]) {
      for (const option of group) map.set(option.id, option.label);
    }
    return map;
  }, [options]);

  const prettify = (dimension: string) =>
    dimension
      .split(" ")
      .map((token) => labelById.get(token) ?? token)
      .join(" ");

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const requirementCount =
    (industry ? 1 : 0) +
    applicationIds.size +
    methodIds.size +
    standardIds.size +
    sampleTypeIds.size +
    organismIds.size +
    (requiredFormat ? 1 : 0) +
    (storage ? 1 : 0) +
    (country ? 1 : 0) +
    (minShelfLife ? 1 : 0);

  const run = () => {
    const requirements: MatchRequirements = {
      ...(industry ? { industry } : {}),
      ...(applicationIds.size ? { applicationIds: [...applicationIds] } : {}),
      ...(methodIds.size ? { methodIds: [...methodIds] } : {}),
      ...(standardIds.size ? { standardIds: [...standardIds] } : {}),
      ...(sampleTypeIds.size ? { sampleTypeIds: [...sampleTypeIds] } : {}),
      ...(organismIds.size ? { organismIds: [...organismIds] } : {}),
      ...(requiredFormat ? { requiredFormat } : {}),
      ...(storage ? { storage } : {}),
      ...(country ? { country } : {}),
      ...(minShelfLife ? { minShelfLifeMonths: Number(minShelfLife) } : {}),
    };
    setResults(matchProducts(requirements, candidates));
    setRanAt(new Date());
  };

  const extrasByProduct = useMemo(() => {
    const map = new Map<string, SkuExtra[]>();
    for (const candidate of candidates) map.set(candidate.product.id, candidate.extras);
    return map;
  }, [candidates]);

  const productById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.product.id, candidate.product])),
    [candidates],
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Requirements"
        description="Every selection becomes one scored dimension. Leave everything empty to list all products unfiltered (score 100 by definition)."
      >
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <CheckboxGroup
              legend="Applications"
              options={options.applications}
              selected={applicationIds}
              onToggle={toggle(setApplicationIds)}
            />
            <CheckboxGroup
              legend="Standards"
              options={options.standards}
              selected={standardIds}
              onToggle={toggle(setStandardIds)}
            />
            <CheckboxGroup
              legend="Organisms"
              options={options.organisms}
              selected={organismIds}
              onToggle={toggle(setOrganismIds)}
            />
            <CheckboxGroup
              legend="Sample types"
              options={options.sampleTypes}
              selected={sampleTypeIds}
              onToggle={toggle(setSampleTypeIds)}
            />
            <CheckboxGroup
              legend="Methods"
              options={options.methods}
              selected={methodIds}
              onToggle={toggle(setMethodIds)}
            />
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="match-industry" className="mb-1 block text-xs">
                  Industry
                </Label>
                <select
                  id="match-industry"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
                >
                  <option value="">Any</option>
                  {options.industries.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="match-format" className="mb-1 block text-xs">
                  Format
                </Label>
                <select
                  id="match-format"
                  value={requiredFormat}
                  onChange={(event) => setRequiredFormat(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
                >
                  <option value="">Any</option>
                  {options.formats.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="match-country" className="mb-1 block text-xs">
                  Country availability
                </Label>
                <select
                  id="match-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
                >
                  <option value="">Any</option>
                  {options.countries.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="match-storage" className="mb-1 block text-xs">
                  Storage condition
                </Label>
                <select
                  id="match-storage"
                  value={storage}
                  onChange={(event) => setStorage(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
                >
                  <option value="">Any</option>
                  {options.storages.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="match-shelf-life" className="mb-1 block text-xs">
                  Min shelf life (months)
                </Label>
                <Input
                  id="match-shelf-life"
                  type="number"
                  min={0}
                  value={minShelfLife}
                  onChange={(event) => setMinShelfLife(event.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={run}>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Run matching
            </Button>
            <p className="text-xs text-slate-500">
              {requirementCount === 0
                ? "No requirements selected — results will be unfiltered."
                : `${requirementCount} dimension${requirementCount === 1 ? "" : "s"} will be scored per product.`}
            </p>
          </div>
        </div>
      </SectionCard>

      {results ? (
        <section aria-label="Matching results" className="space-y-3">
          <p className="text-xs text-slate-500" role="status">
            {results.length} products ranked
            {ranAt ? ` · ran ${ranAt.toLocaleTimeString("en-GB")}` : ""}. Score = matched dimensions
            / required dimensions.
          </p>
          {results.map((result) => {
            const product = productById.get(result.productId);
            const extras = extrasByProduct.get(result.productId) ?? [];
            const totalDimensions =
              result.matchedDimensions.length +
              result.missingDimensions.length +
              result.conflicts.filter((conflict) => conflict !== "product discontinued").length;
            return (
              <Card key={result.productId}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">
                      {product ? (
                        <Link href={`/products/${product.id}`} className="text-accent hover:underline">
                          {result.productName}
                        </Link>
                      ) : (
                        result.productName
                      )}
                      {product ? (
                        <span className="ml-2 align-middle">
                          <ProductStatusBadge status={product.status} />
                        </span>
                      ) : null}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-slate-500">
                        {result.matchedDimensions.length}/{totalDimensions} dimensions
                      </span>
                      <span className="w-36">
                        <span className="sr-only">Score {result.score}</span>
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                result.score >= 75
                                  ? "bg-success"
                                  : result.score >= 50
                                    ? "bg-warning"
                                    : "bg-danger",
                              )}
                              style={{ width: `${result.score}%` }}
                            />
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-slate-800">
                            {result.score}
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {result.matchedDimensions.map((dimension) => (
                      <Badge
                        key={dimension}
                        variant="outline"
                        className="border-success-border bg-success-bg font-normal text-success-fg"
                      >
                        {prettify(dimension)}
                      </Badge>
                    ))}
                    {result.missingDimensions.map((dimension) => (
                      <Badge
                        key={dimension}
                        variant="outline"
                        className="border-dashed border-slate-400 font-normal text-slate-500"
                        title="No supporting evidence — this dimension counts as missing, not as zero"
                      >
                        missing: {prettify(dimension)}
                      </Badge>
                    ))}
                    {result.conflicts.map((conflict) => (
                      <Badge
                        key={conflict}
                        variant="outline"
                        className="border-danger-border bg-danger-bg font-normal text-danger-fg"
                      >
                        conflict: {prettify(conflict)}
                      </Badge>
                    ))}
                  </div>
                  {result.recommendedNextAction ? (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Next action:</span>{" "}
                      {prettify(result.recommendedNextAction)} — add evidence to close the gap.
                    </p>
                  ) : null}
                  {extras.length > 0 ? (
                    <ul className="divide-y divide-slate-100 border-t border-slate-100">
                      {extras.map((sku) => (
                        <li key={sku.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs">
                          <Link
                            href={`/skus/${sku.id}`}
                            className="font-medium text-accent hover:underline"
                          >
                            {sku.name}
                          </Link>
                          {sku.status === "discontinued" ? (
                            <ProductStatusBadge status={sku.status} />
                          ) : null}
                          <span className="flex items-center gap-1 text-slate-500">
                            Availability:
                            {sku.availability.length === 0 ? (
                              <span className="italic text-slate-400">no observations</span>
                            ) : (
                              sku.availability.map((status) => (
                                <AvailabilityBadge
                                  key={status}
                                  status={status as AvailabilityStatus}
                                />
                              ))
                            )}
                          </span>
                          <span className="text-slate-500">
                            {sku.listingCount} supplier listing{sku.listingCount === 1 ? "" : "s"}
                          </span>
                          <span className="text-slate-600">
                            {sku.latestPrice
                              ? `Latest price ${formatMoney(sku.latestPrice.amount, sku.latestPrice.currency)} (${sku.latestPrice.date})`
                              : "No price observed"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
