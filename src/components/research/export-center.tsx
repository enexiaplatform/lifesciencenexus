"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileJson, FileSpreadsheet, FileText, Printer } from "lucide-react";

import type {
  EntityType,
  EvidenceState,
  ResearchExportFormat,
  ResearchFinding,
} from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/components/evidence/format";
import { entityTypeLabel, humanize } from "@/components/search/entity-routes";
import { toCsv, type CsvColumn } from "@/lib/domain/export";
import { recordResearchExportAction } from "@/app/(research)/research/actions";

interface ExportEntity {
  entityType: EntityType;
  entityId: string;
  title: string;
}

interface ExportNote {
  id: string;
  text: string;
  createdAt: string;
}

interface ExportHistoryEntry {
  id: string;
  format: ResearchExportFormat;
  fileName?: string;
  createdAt: string;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "research-export"
  );
}

function download(fileName: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** EXPORT CENTER: JSON / CSV / XLSX downloads + printable web report. */
export function ExportCenter({
  projectId,
  projectTitle,
  isDemo,
  entities,
  findings,
  notes,
  claimReferences,
  exports,
}: {
  projectId: string;
  projectTitle: string;
  isDemo: boolean;
  entities: ExportEntity[];
  findings: ResearchFinding[];
  notes: ExportNote[];
  claimReferences: Array<{ id: string; predicate: string; reviewStatus: EvidenceState }>;
  exports: ExportHistoryEntry[];
}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const slug = slugify(projectTitle);

  function record(format: ResearchExportFormat, fileName: string) {
    // Bookkeeping is fire-and-forget; the download itself must never block on it.
    recordResearchExportAction({ projectId, format, fileName }).catch(() => undefined);
  }

  function exportJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      syntheticDemoData: isDemo,
      project: { id: projectId, title: projectTitle },
      entities,
      findings: findings.map((finding) => ({
        kind: finding.kind,
        text: finding.text,
        evidenceClaimIds: finding.evidenceClaimIds,
      })),
      notes,
      claimReferences,
    };
    const fileName = `${slug}.json`;
    download(fileName, JSON.stringify(payload, null, 2), "application/json");
    record("json", fileName);
    setFeedback(`Downloaded ${fileName}`);
  }

  function exportCsv() {
    const columns: CsvColumn<ResearchFinding>[] = [
      { key: "kind", header: "Kind", value: (row) => humanize(row.kind) },
      { key: "text", header: "Finding", value: (row) => row.text },
      {
        key: "claims",
        header: "Evidence claim ids",
        value: (row) => row.evidenceClaimIds.join("; "),
      },
      { key: "updated", header: "Updated", value: (row) => row.updatedAt },
    ];
    const fileName = `${slug}-findings.csv`;
    download(fileName, toCsv(findings, columns), "text/csv;charset=utf-8");
    record("csv", fileName);
    setFeedback(`Downloaded ${fileName}`);
  }

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const entityRows = entities.map((entity) => ({
      "Entity type": entityTypeLabel(entity.entityType),
      Title: entity.title,
      "Entity id": entity.entityId,
    }));
    const findingRows = findings.map((finding) => ({
      Kind: humanize(finding.kind),
      Finding: finding.text,
      "Evidence claim ids": finding.evidenceClaimIds.join("; "),
      Updated: finding.updatedAt,
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(entityRows.length > 0 ? entityRows : [{ "Entity type": "", Title: "", "Entity id": "" }]),
      "Entities",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(findingRows.length > 0 ? findingRows : [{ Kind: "", Finding: "", "Evidence claim ids": "", Updated: "" }]),
      "Findings",
    );
    const fileName = `${slug}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    record("xlsx", fileName);
    setFeedback(`Downloaded ${fileName}`);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Download className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Export center
        </CardTitle>
        <CardDescription className="text-xs">
          Take this research out of Nexus. PDF: use browser Print → Save as PDF on the web
          report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <FileJson className="h-4 w-4" aria-hidden="true" />
            JSON (project + entities + findings)
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileText className="h-4 w-4" aria-hidden="true" />
            CSV (findings)
          </Button>
          <Button variant="outline" size="sm" onClick={() => void exportXlsx()}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            XLSX workbook
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/research/${projectId}/report`}
              onClick={() => record("web_report", `${slug}-report.html`)}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Printable web report
            </Link>
          </Button>
        </div>
        <p aria-live="polite" className="text-xs text-teal-700">
          {feedback ?? ""}
        </p>
        {exports.length > 0 && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Export history
            </h3>
            <ul className="space-y-1">
              {[...exports]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 5)
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2 text-xs text-slate-600"
                  >
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {entry.format}
                    </Badge>
                    <span className="truncate">{entry.fileName ?? "—"}</span>
                    <span className="text-slate-400">{formatDateTime(entry.createdAt)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
