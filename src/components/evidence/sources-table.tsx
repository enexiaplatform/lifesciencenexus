"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, FileText } from "lucide-react";

import type { EvidenceState, SourceType, Visibility } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { IsDemoBadge, VisibilityBadge } from "@/components/evidence/meta-badges";
import { formatDate } from "@/components/evidence/format";
import { humanize } from "@/components/search/entity-routes";

export interface SourceClaimRow {
  id: string;
  predicate: string;
  valueText: string;
  reviewStatus: EvidenceState;
}

export interface SourceRow {
  id: string;
  type: SourceType;
  title: string;
  publisher?: string;
  url?: string;
  publishedAt?: string;
  capturedAt: string;
  notes?: string;
  visibility: Visibility;
  isDemo: boolean;
  documentFileName?: string;
  claims: SourceClaimRow[];
}

/** Dense sources table with expandable claim listings per source. */
export function SourcesTable({ rows }: { rows: SourceRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No sources captured yet</CardTitle>
          <CardDescription>
            Add a catalogue, quotation, tender document or field note to start backing claims
            with evidence.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" aria-label="Expand" />
            <TableHead>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Publisher / date</TableHead>
            <TableHead>Link / document</TableHead>
            <TableHead>Evidence states</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead>Visibility</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isOpen = expanded.has(row.id);
            const stateCounts = new Map<EvidenceState, number>();
            for (const claim of row.claims) {
              stateCounts.set(claim.reviewStatus, (stateCounts.get(claim.reviewStatus) ?? 0) + 1);
            }
            return (
              <Fragment key={row.id}>
                <TableRow data-state={isOpen ? "selected" : undefined}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggle(row.id)}
                      aria-expanded={isOpen}
                      aria-controls={`source-claims-${row.id}`}
                      aria-label={isOpen ? `Collapse claims of ${row.title}` : `Expand claims of ${row.title}`}
                      className="rounded-sm p-0.5 text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="whitespace-nowrap text-[10px]">
                      {humanize(row.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-80">
                    <span className="block truncate font-medium text-slate-900" title={row.title}>
                      {row.title}
                    </span>
                    <IsDemoBadge isDemo={row.isDemo} className="mt-0.5" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-600">
                    {row.publisher ?? "—"}
                    {row.publishedAt && (
                      <span className="block text-slate-400">{formatDate(row.publishedAt)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        Open URL
                      </a>
                    ) : row.documentFileName ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        {row.documentFileName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stateCounts.size === 0 ? (
                      <span className="text-xs text-slate-400">No claims</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {[...stateCounts.entries()].map(([state, count]) => (
                          <span key={state} className="inline-flex items-center gap-1">
                            <EvidenceStateBadge state={state} className="text-[10px]" />
                            <span className="text-xs tabular-nums text-slate-600">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.claims.length}</TableCell>
                  <TableCell>
                    <VisibilityBadge visibility={row.visibility} />
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="bg-slate-50/70 px-6 py-3">
                      <div id={`source-claims-${row.id}`}>
                        {row.notes && (
                          <p className="mb-2 text-xs italic text-slate-500">{row.notes}</p>
                        )}
                        {row.claims.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No claims reference this source yet.
                          </p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-500">
                                <th scope="col" className="pb-1 pr-4 font-medium">Predicate</th>
                                <th scope="col" className="pb-1 pr-4 font-medium">Value</th>
                                <th scope="col" className="pb-1 font-medium">State</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.claims.map((claim) => (
                                <tr key={claim.id} className="border-t border-slate-200">
                                  <td className="py-1.5 pr-4 font-medium text-slate-700">
                                    {humanize(claim.predicate)}
                                  </td>
                                  <td className="py-1.5 pr-4 text-slate-600">
                                    {claim.valueText}
                                  </td>
                                  <td className="py-1.5">
                                    <EvidenceStateBadge state={claim.reviewStatus} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
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
  );
}
