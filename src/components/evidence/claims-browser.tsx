"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import type {
  ConfidenceDimensions,
  EntityType,
  EvidenceState,
  SourceType,
  Visibility,
} from "@/lib/domain/types";
import { EVIDENCE_STATES, SOURCE_TYPES } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfidenceDimensionsList,
  ConfidenceMiniBars,
} from "@/components/evidence/confidence";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { IsDemoBadge, VisibilityBadge } from "@/components/evidence/meta-badges";
import { SourceChip } from "@/components/evidence/source-chip";
import { formatDate, formatDateTime } from "@/components/evidence/format";
import {
  entityHref,
  entityTypeLabel,
  humanize,
} from "@/components/search/entity-routes";
import { isReviewDue } from "@/lib/domain/freshness";

export interface ClaimReviewEntry {
  id: string;
  fromState: EvidenceState;
  toState: EvidenceState;
  comment?: string;
  reviewerId: string;
  reviewedAt: string;
}

export interface ClaimRow {
  id: string;
  subjectEntityType: EntityType;
  subjectEntityId: string;
  subjectTitle: string;
  predicate: string;
  valueText: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  reviewStatus: EvidenceState;
  visibility: Visibility;
  isDemo: boolean;
  reviewByDate?: string;
  effectiveDate?: string;
  confidence: ConfidenceDimensions;
  contradictingClaimIds: string[];
  reviewerId?: string;
  updatedAt: string;
  reviews: ClaimReviewEntry[];
}

/** Dense claims browser with filters and expandable evidence detail rows. */
export function ClaimsBrowser({
  rows,
  claimLabels,
}: {
  rows: ClaimRow[];
  claimLabels: Record<string, string>;
}) {
  const [stateFilter, setStateFilter] = useState<EvidenceState | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility | "all">("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceType | "all">("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const presentSourceTypes = useMemo(
    () => SOURCE_TYPES.filter((type) => rows.some((row) => row.sourceType === type)),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (stateFilter !== "all" && row.reviewStatus !== stateFilter) return false;
        if (visibilityFilter !== "all" && row.visibility !== visibilityFilter) return false;
        if (sourceTypeFilter !== "all" && row.sourceType !== sourceTypeFilter) return false;
        if (overdueOnly && !isReviewDue(row.reviewByDate)) return false;
        return true;
      }),
    [rows, stateFilter, visibilityFilter, sourceTypeFilter, overdueOnly],
  );

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="filter-state" className="text-xs">
            Evidence state
          </Label>
          <Select
            value={stateFilter}
            onValueChange={(value) => setStateFilter(value as EvidenceState | "all")}
          >
            <SelectTrigger id="filter-state" className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {EVIDENCE_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {humanize(state)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-visibility" className="text-xs">
            Visibility
          </Label>
          <Select
            value={visibilityFilter}
            onValueChange={(value) => setVisibilityFilter(value as Visibility | "all")}
          >
            <SelectTrigger id="filter-visibility" className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="canonical">Canonical</SelectItem>
              <SelectItem value="tenant_private">Tenant private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-source-type" className="text-xs">
            Source type
          </Label>
          <Select
            value={sourceTypeFilter}
            onValueChange={(value) => setSourceTypeFilter(value as SourceType | "all")}
          >
            <SelectTrigger id="filter-source-type" className="h-8 w-52 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All source types</SelectItem>
              {presentSourceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {humanize(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-8 cursor-pointer items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => setOverdueOnly(event.target.checked)}
            aria-label="Show only overdue reviews"
            className="h-3.5 w-3.5 rounded border-slate-300 accent-navy-900"
          />
          Overdue reviews only
        </label>
        <p aria-live="polite" className="ml-auto text-xs text-slate-500">
          {filtered.length} of {rows.length} claims
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" aria-label="Expand" />
              <TableHead>Subject</TableHead>
              <TableHead>Predicate</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Review by</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-sm text-slate-500">
                  No claims match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const overdue = isReviewDue(row.reviewByDate);
              const isOpen = expanded.has(row.id);
              return (
                <Fragment key={row.id}>
                  <TableRow data-state={isOpen ? "selected" : undefined}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggle(row.id)}
                        aria-expanded={isOpen}
                        aria-controls={`claim-detail-${row.id}`}
                        aria-label={isOpen ? "Collapse claim detail" : "Expand claim detail"}
                        className="rounded-sm p-0.5 text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <Link
                        href={entityHref(row.subjectEntityType, row.subjectEntityId)}
                        className="block truncate font-medium text-slate-900 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        title={row.subjectTitle}
                      >
                        {row.subjectTitle}
                      </Link>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        {entityTypeLabel(row.subjectEntityType)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-700">
                      {humanize(row.predicate)}
                    </TableCell>
                    <TableCell className="max-w-52">
                      <span className="block truncate text-xs text-slate-600" title={row.valueText}>
                        {row.valueText}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SourceChip type={row.sourceType} title={row.sourceTitle} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceMiniBars confidence={row.confidence} />
                    </TableCell>
                    <TableCell>
                      <EvidenceStateBadge state={row.reviewStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <VisibilityBadge visibility={row.visibility} />
                        <IsDemoBadge isDemo={row.isDemo} />
                      </div>
                    </TableCell>
                    <TableCell
                      className={
                        overdue
                          ? "whitespace-nowrap text-xs font-medium text-red-600"
                          : "whitespace-nowrap text-xs text-slate-600"
                      }
                    >
                      {row.reviewByDate ? formatDate(row.reviewByDate) : "—"}
                      {overdue && <span className="block text-[10px]">Overdue</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {row.effectiveDate ? formatDate(row.effectiveDate) : "—"}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={10} className="bg-slate-50/70 px-6 py-4">
                        <div id={`claim-detail-${row.id}`} className="grid gap-4 lg:grid-cols-3">
                          <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Confidence dimensions
                            </h3>
                            <ConfidenceDimensionsList confidence={row.confidence} />
                          </div>
                          <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Contradicting claims
                            </h3>
                            {row.contradictingClaimIds.length === 0 ? (
                              <p className="text-xs text-slate-500">None recorded.</p>
                            ) : (
                              <ul className="space-y-1">
                                {row.contradictingClaimIds.map((id) => (
                                  <li key={id} className="text-xs text-slate-700">
                                    <Badge variant="destructive" className="mr-1 text-[10px]">
                                      Contradicts
                                    </Badge>
                                    {claimLabels[id] ?? id}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Meta
                            </h3>
                            <dl className="space-y-1 text-xs text-slate-600">
                              <div className="flex gap-2">
                                <dt className="w-24 shrink-0 text-slate-400">Claim id</dt>
                                <dd className="font-mono">{row.id}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-24 shrink-0 text-slate-400">Reviewer</dt>
                                <dd>{row.reviewerId ?? "Unassigned"}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-24 shrink-0 text-slate-400">Updated</dt>
                                <dd>{formatDateTime(row.updatedAt)}</dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Review history & notes
                            </h3>
                            {row.reviews.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                No reviews yet — this claim is waiting in the review queue.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {row.reviews.map((review) => (
                                  <li key={review.id} className="text-xs">
                                    <div className="flex flex-wrap items-center gap-1">
                                      <EvidenceStateBadge state={review.fromState} />
                                      <span aria-hidden="true">→</span>
                                      <EvidenceStateBadge state={review.toState} />
                                    </div>
                                    {review.comment && (
                                      <p className="mt-0.5 text-slate-600">{review.comment}</p>
                                    )}
                                    <p className="mt-0.5 text-slate-400">
                                      {review.reviewerId} · {formatDateTime(review.reviewedAt)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
