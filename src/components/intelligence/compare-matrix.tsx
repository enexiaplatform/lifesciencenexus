"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  HelpCircle,
  MinusCircle,
  Printer,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toCsv } from "@/lib/domain/export";
import type { ComparisonVerdict, ProductStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { downloadText } from "../products/download";
import { ProductStatusBadge } from "../products/badges";

export interface EvidenceValue {
  value: string;
  sourceTitle: string | null;
}

export interface CompareSku {
  id: string;
  name: string;
  catalogueNumber: string | null;
  status: ProductStatus;
  packLabel: string | null;
  shelfLifeMonths: number | null;
  storageCondition: string | null;
  formatName: string | null;
  standards: EvidenceValue[];
  organisms: EvidenceValue[];
  applications: EvidenceValue[];
}

interface CellData {
  valueText: string;
  verdict: ComparisonVerdict;
  /** Evidence provenance per value (set rows only). */
  evidence: EvidenceValue[];
  /** True for the reference SKU's own cells. */
  reference: boolean;
}

interface RowData {
  key: string;
  label: string;
  cells: CellData[];
}

const VERDICT_ICONS: Record<ComparisonVerdict, { icon: typeof CheckCircle2; className: string; label: string }> = {
  met: { icon: CheckCircle2, className: "text-success-fg", label: "Met" },
  partially_met: { icon: MinusCircle, className: "text-warning-fg", label: "Partially met" },
  not_met: { icon: XCircle, className: "text-danger-fg", label: "Not met" },
  unknown: { icon: HelpCircle, className: "text-slate-400", label: "Unknown (no evidence)" },
};

function textVerdict(base: string | null, value: string | null): ComparisonVerdict {
  if (value === null) return "unknown";
  if (base === null) return "unknown";
  return value.trim().toLowerCase() === base.trim().toLowerCase() ? "met" : "not_met";
}

function shelfLifeVerdict(base: number | null, value: number | null): ComparisonVerdict {
  if (value === null || base === null) return "unknown";
  if (value >= base) return "met";
  return value >= base * 0.8 ? "partially_met" : "not_met";
}

function setVerdict(base: EvidenceValue[], value: EvidenceValue[]): ComparisonVerdict {
  if (base.length === 0 || value.length === 0) return "unknown";
  const baseSet = new Set(base.map((item) => item.value));
  const valueSet = new Set(value.map((item) => item.value));
  const intersection = [...valueSet].filter((item) => baseSet.has(item));
  if (intersection.length === baseSet.size && intersection.length === valueSet.size) return "met";
  return intersection.length > 0 ? "partially_met" : "not_met";
}

/**
 * Comparison matrix: rows are structured specs pulled from SKU records plus
 * evidence-edge sets (standards/organisms/applications). Every cell carries a
 * verdict against the reference (first) SKU — 'unknown' (no data) is rendered
 * distinctly from 'not met' (data contradicts).
 */
export function CompareMatrix({ skus }: { skus: CompareSku[] }) {
  const [requirements, setRequirements] = useState<Record<string, "mandatory" | "preferred">>({});

  const rows = useMemo<RowData[]>(() => {
    const base = skus[0];
    const textRow = (key: string, label: string, pick: (sku: CompareSku) => string | null): RowData => ({
      key,
      label,
      cells: skus.map((sku, index) => {
        const value = pick(sku);
        return {
          valueText: value ?? "—",
          verdict: index === 0 ? (value === null ? "unknown" : "met") : textVerdict(pick(base), value),
          evidence: [],
          reference: index === 0,
        };
      }),
    });
    const setRow = (key: string, label: string, pick: (sku: CompareSku) => EvidenceValue[]): RowData => ({
      key,
      label,
      cells: skus.map((sku, index) => {
        const values = pick(sku);
        return {
          valueText: values.length === 0 ? "—" : values.map((item) => item.value).join(", "),
          verdict: index === 0 ? (values.length === 0 ? "unknown" : "met") : setVerdict(pick(base), values),
          evidence: values,
          reference: index === 0,
        };
      }),
    });
    return [
      textRow("pack", "Pack size", (sku) => sku.packLabel),
      {
        key: "shelfLife",
        label: "Shelf life (months)",
        cells: skus.map((sku, index) => ({
          valueText: sku.shelfLifeMonths !== null ? String(sku.shelfLifeMonths) : "—",
          verdict:
            index === 0
              ? sku.shelfLifeMonths === null
                ? "unknown"
                : "met"
              : shelfLifeVerdict(base.shelfLifeMonths, sku.shelfLifeMonths),
          evidence: [],
          reference: index === 0,
        })),
      },
      textRow("storage", "Storage condition", (sku) => sku.storageCondition),
      textRow("format", "Format", (sku) => sku.formatName),
      setRow("standards", "Standards", (sku) => sku.standards),
      setRow("organisms", "Organisms", (sku) => sku.organisms),
      setRow("applications", "Applications", (sku) => sku.applications),
    ];
  }, [skus]);

  const requirementOf = (key: string) => requirements[key] ?? "mandatory";

  const summary = useMemo(
    () =>
      skus.map((_, column) => {
        const counts: Record<ComparisonVerdict, number> = {
          met: 0,
          partially_met: 0,
          not_met: 0,
          unknown: 0,
        };
        let mandatoryMet = 0;
        let mandatoryTotal = 0;
        for (const row of rows) {
          const verdict = row.cells[column].verdict;
          counts[verdict] += 1;
          if (requirementOf(row.key) === "mandatory") {
            mandatoryTotal += 1;
            if (verdict === "met") mandatoryMet += 1;
          }
        }
        return { counts, mandatoryMet, mandatoryTotal };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, skus, requirements],
  );

  const exportCsv = () => {
    const columns = [
      { key: "spec", header: "Spec", value: (row: RowData) => row.label },
      {
        key: "requirement",
        header: "Requirement",
        value: (row: RowData) => requirementOf(row.key),
      },
      ...skus.flatMap((sku, index) => [
        {
          key: `${sku.id}-value`,
          header: `${sku.name} — value`,
          value: (row: RowData) => row.cells[index].valueText,
        },
        {
          key: `${sku.id}-verdict`,
          header: `${sku.name} — verdict`,
          value: (row: RowData) => row.cells[index].verdict,
        },
      ]),
    ];
    downloadText(`sku-comparison-${skus.map((sku) => sku.id).join("_")}.csv`, toCsv(rows, columns), "text/csv");
  };

  return (
    <Card>
      {/* Print support: app chrome self-hides (print:hidden); hide controls, keep the matrix. */}
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <CardContent className="space-y-3 p-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Verdicts compare every SKU against the reference (first column). Rows can be marked
            mandatory or preferred; the summary counts mandatory rows met.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Spec</TableHead>
              <TableHead className="no-print w-28">Row type</TableHead>
              {skus.map((sku, index) => (
                <TableHead key={sku.id}>
                  <div className="space-y-1">
                    <Link href={`/skus/${sku.id}`} className="text-accent hover:underline">
                      {sku.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1">
                      {index === 0 ? (
                        <span className="rounded bg-nexus-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-nexus-700">
                          Reference
                        </span>
                      ) : null}
                      <ProductStatusBadge status={sku.status} />
                    </div>
                    {sku.catalogueNumber ? (
                      <p className="font-mono text-[10px] normal-case text-slate-400">
                        {sku.catalogueNumber}
                      </p>
                    ) : null}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="text-xs font-medium text-slate-700">{row.label}</TableCell>
                <TableCell className="no-print">
                  <select
                    aria-label={`Requirement level for ${row.label}`}
                    value={requirementOf(row.key)}
                    onChange={(event) =>
                      setRequirements((current) => ({
                        ...current,
                        [row.key]: event.target.value as "mandatory" | "preferred",
                      }))
                    }
                    className={cn(
                      "h-7 rounded-md border px-1.5 text-[11px] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600",
                      requirementOf(row.key) === "mandatory"
                        ? "border-nexus-300 bg-nexus-50 text-nexus-800"
                        : "border-slate-300 bg-white text-slate-600",
                    )}
                  >
                    <option value="mandatory">mandatory</option>
                    <option value="preferred">preferred</option>
                  </select>
                </TableCell>
                {row.cells.map((cell, column) => {
                  const config = VERDICT_ICONS[cell.verdict];
                  const Icon = config.icon;
                  return (
                    <TableCell key={skus[column].id}>
                      <div className="flex items-start gap-1.5">
                        <Icon
                          className={cn("mt-0.5 h-4 w-4 shrink-0", config.className)}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700">
                            {cell.valueText}
                            {cell.reference ? (
                              <span className="ml-1 text-[10px] uppercase text-slate-400">(ref)</span>
                            ) : null}
                          </p>
                          <p className="sr-only">{config.label}</p>
                          {cell.evidence.some((item) => item.sourceTitle) ? (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {cell.evidence
                                .filter((item) => item.sourceTitle)
                                .map((item) => `${item.value}: ${item.sourceTitle}`)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {/* Summary row */}
            <TableRow className="bg-slate-50 font-medium">
              <TableCell className="text-xs font-semibold text-slate-800">
                Summary (verdict counts)
              </TableCell>
              <TableCell className="no-print" />
              {summary.map((entry, column) => (
                <TableCell key={skus[column].id}>
                  <div className="space-y-1 text-[11px]">
                    <p className="text-slate-700">
                      Mandatory met:{" "}
                      <span className="font-semibold">
                        {entry.mandatoryMet}/{entry.mandatoryTotal}
                      </span>
                    </p>
                    <p className="flex flex-wrap gap-x-2 text-slate-500">
                      <span className="text-success-fg">met {entry.counts.met}</span>
                      <span className="text-warning-fg">partial {entry.counts.partially_met}</span>
                      <span className="text-danger-fg">not met {entry.counts.not_met}</span>
                      <span className="text-slate-400">unknown {entry.counts.unknown}</span>
                    </p>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>

        <p className="text-[11px] text-slate-400">
          Verdict rules: text rows compare exact values; shelf life ≥ reference is met, ≥ 80% is
          partially met; set rows compare evidence-backed value sets (equal = met, partial overlap =
          partially met, none = not met, no data = unknown).
        </p>
      </CardContent>
    </Card>
  );
}
