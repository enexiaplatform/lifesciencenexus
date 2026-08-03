"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toCsv } from "@/lib/domain/export";
import { applyMapping, autoMapColumns, type ColumnMapping } from "@/lib/imports/mapping";
import { parseCsvText, parseXlsxArrayBuffer, rowsFromTsvPaste, type ParsedTable } from "@/lib/imports/parse";
import type { ImportDuplicateHit, ImportReport, RunImportResult } from "@/lib/imports/run";
import {
  IMPORT_KINDS,
  IMPORT_TEMPLATES,
  templateCsv,
  type ImportKind,
} from "@/lib/imports/templates";
import { validateRows, type ImportSummary } from "@/lib/imports/validate";
import {
  checkImportDuplicatesAction,
  runImportAction,
} from "@/app/(ops)/imports/actions";

/**
 * The 9-step ingestion wizard. All parsing/mapping/validation runs
 * client-side (pure helpers in @/lib/imports); duplicate scoring and the
 * final commit go through server actions against the demo repository.
 *
 * Steps: (1) template, (2) upload, (3) preview, (4) mapping, (5) validation,
 * (6) duplicates, (7) visibility, (8) import, (9) report.
 */

const STEPS = [
  "Template",
  "Upload",
  "Preview",
  "Mapping",
  "Validation",
  "Duplicates",
  "Visibility",
  "Import",
  "Report",
] as const;

const UNMAPPED = "__none__";
const DUPLICATE_STEP_KINDS: ReadonlySet<ImportKind> = new Set(["organizations", "skus"]);
const PREVIEW_LIMIT = 50;

function downloadTextFile(fileName: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ImportKind>("organizations");
  const [fileName, setFileName] = useState("pasted-table.csv");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importValidOnly, setImportValidOnly] = useState(true);
  const [dupHits, setDupHits] = useState<ImportDuplicateHit[] | null>(null);
  const [dupSkips, setDupSkips] = useState<Set<number>>(new Set());
  const [dupLoading, setDupLoading] = useState(false);
  const [visibility, setVisibility] = useState<"tenant_private" | "canonical">("tenant_private");
  const [result, setResult] = useState<RunImportResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const template = IMPORT_TEMPLATES[kind];

  // Re-run auto-mapping whenever a new table arrives.
  useEffect(() => {
    if (table) {
      setMapping(autoMapColumns(table.headers, template));
    }
  }, [table, template]);

  const mappedRows = useMemo(
    () => (table ? applyMapping(table.rows, mapping) : []),
    [table, mapping],
  );

  const summary: ImportSummary | null = useMemo(
    () => (table ? validateRows(kind, mappedRows) : null),
    [table, kind, mappedRows],
  );

  const requiredMapped = template.columns
    .filter((column) => column.required)
    .every((column) => mapping[column.key]);

  const supportsDuplicateStep = DUPLICATE_STEP_KINDS.has(kind);

  // Kick off the duplicate check when the step is first reached.
  useEffect(() => {
    if (step !== 5 || !supportsDuplicateStep || dupHits !== null || dupLoading || mappedRows.length === 0) {
      return;
    }
    setDupLoading(true);
    checkImportDuplicatesAction(kind, mappedRows)
      .then((hits) => {
        setDupHits(hits);
        // Default decision: near-certain matches (>=0.9) skip, others import anyway.
        const skips = new Set<number>();
        const bestByRow = new Map<number, number>();
        for (const hit of hits) {
          bestByRow.set(hit.rowIndex, Math.max(bestByRow.get(hit.rowIndex) ?? 0, hit.score));
        }
        for (const [rowIndex, score] of bestByRow) {
          if (score >= 0.9) skips.add(rowIndex);
        }
        setDupSkips(skips);
      })
      .catch(() => setActionError("Duplicate check failed. You can retry from the duplicates step."))
      .finally(() => setDupLoading(false));
  }, [step, supportsDuplicateStep, dupHits, dupLoading, kind, mappedRows]);

  function resetAll(keepKind = true) {
    setStep(0);
    if (!keepKind) setKind("organizations");
    setTable(null);
    setPasteText("");
    setMapping({});
    setDupHits(null);
    setDupSkips(new Set());
    setVisibility("tenant_private");
    setResult(null);
    setActionError(null);
    setImportValidOnly(true);
    setFileName("pasted-table.csv");
  }

  function acceptTable(parsed: ParsedTable, name: string) {
    setTable(parsed);
    setFileName(name);
    setDupHits(null);
    setDupSkips(new Set());
    setResult(null);
    setActionError(null);
  }

  async function onFileSelected(file: File) {
    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        acceptTable(parseXlsxArrayBuffer(await file.arrayBuffer()), file.name);
      } else {
        acceptTable(parseCsvText(await file.text()), file.name);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not read the file.");
    }
  }

  function runImport() {
    setActionError(null);
    startTransition(async () => {
      try {
        const outcome = await runImportAction({
          kind,
          rows: mappedRows,
          fileName,
          visibility,
          importValidOnly,
          skipRowIndexes: [...dupSkips],
        });
        setResult(outcome);
        setStep(8);
        if (outcome.ok) router.refresh(); // refresh the batches list
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Import failed unexpectedly.");
      }
    });
  }

  const canNext =
    step === 0 ? true
    : step === 1 ? table !== null && table.rows.length > 0
    : step === 2 ? true
    : step === 3 ? requiredMapped
    : step === 4 ? summary !== null && (importValidOnly || summary.invalid === 0)
    : step === 5 ? !supportsDuplicateStep || (dupHits !== null && !dupLoading)
    : step === 6 ? true
    : false;

  const dupRows = useMemo(() => {
    if (!dupHits) return [];
    const byRow = new Map<number, ImportDuplicateHit[]>();
    for (const hit of dupHits) {
      const list = byRow.get(hit.rowIndex) ?? [];
      list.push(hit);
      byRow.set(hit.rowIndex, list);
    }
    return [...byRow.entries()].sort((a, b) => a[0] - b[0]);
  }, [dupHits]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import wizard</CardTitle>
        <CardDescription>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </CardDescription>
        <ol className="flex flex-wrap gap-1.5 pt-2" aria-label="Wizard steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                index === step
                  ? "bg-navy-900 text-white"
                  : index < step
                    ? "bg-teal-50 text-teal-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent className="space-y-5">
        {actionError ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-fg">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {actionError}
          </div>
        ) : null}

        {step === 0 ? (
          <StepTemplate
            kind={kind}
            onKindChange={(next) => {
              setKind(next);
              setTable(null);
              setDupHits(null);
              setResult(null);
            }}
          />
        ) : null}

        {step === 1 ? (
          <StepUpload
            table={table}
            pasteText={pasteText}
            onPasteText={setPasteText}
            onFileSelected={onFileSelected}
            onUsePaste={() => acceptTable(rowsFromTsvPaste(pasteText), "pasted-table.csv")}
          />
        ) : null}

        {step === 2 && table ? <StepPreview table={table} /> : null}

        {step === 3 && table ? (
          <StepMapping kind={kind} headers={table.headers} mapping={mapping} onMapping={setMapping} />
        ) : null}

        {step === 4 && summary ? (
          <StepValidation
            summary={summary}
            mappedRows={mappedRows}
            kind={kind}
            importValidOnly={importValidOnly}
            onImportValidOnly={setImportValidOnly}
          />
        ) : null}

        {step === 5 ? (
          supportsDuplicateStep ? (
            <StepDuplicates
              loading={dupLoading}
              hits={dupHits}
              dupRows={dupRows}
              mappedRows={mappedRows}
              skips={dupSkips}
              onDecision={(rowIndex, skip) => {
                const next = new Set(dupSkips);
                if (skip) next.add(rowIndex);
                else next.delete(rowIndex);
                setDupSkips(next);
              }}
              onRetry={() => setDupHits(null)}
            />
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Duplicate scoring runs for organizations and SKUs. The{" "}
              <span className="font-medium">{template.label}</span> template is
              protected by exact-duplicate skipping at commit time, so you can
              continue directly.
            </p>
          )
        ) : null}

        {step === 6 ? <StepVisibility visibility={visibility} onVisibility={setVisibility} /> : null}

        {step === 7 && summary ? (
          <StepConfirm
            kind={kind}
            fileName={fileName}
            summary={summary}
            dupSkipCount={dupSkips.size}
            visibility={visibility}
            importValidOnly={importValidOnly}
          />
        ) : null}

        {step === 8 && result ? <StepReport result={result} kind={kind} /> : null}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            {step > 0 && step < 8 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
              </Button>
            ) : null}
            {step === 8 ? (
              <Button variant="outline" onClick={() => resetAll()}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Import another file
              </Button>
            ) : null}
          </div>
          <div>
            {step < 7 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
            {step === 7 ? (
              <Button onClick={runImport} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden="true" /> Run import
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function StepTemplate({ kind, onKindChange }: { kind: ImportKind; onKindChange: (kind: ImportKind) => void }) {
  const template = IMPORT_TEMPLATES[kind];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="import-kind">What are you importing?</Label>
          <Select value={kind} onValueChange={(value) => onKindChange(value as ImportKind)}>
            <SelectTrigger id="import-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORT_KINDS.map((option) => (
                <SelectItem key={option} value={option}>
                  {IMPORT_TEMPLATES[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">{template.description}</p>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => downloadTextFile(`nexus-import-template-${kind}.csv`, templateCsv(kind))}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download template (CSV)
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Example</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {template.columns.map((column) => (
            <TableRow key={column.key}>
              <TableCell className="font-medium text-slate-900">{column.label}</TableCell>
              <TableCell>{column.required ? <Badge>required</Badge> : <Badge variant="secondary">optional</Badge>}</TableCell>
              <TableCell className="font-mono text-xs">{column.example}</TableCell>
              <TableCell className="text-xs text-slate-500">{column.description ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StepUpload({
  table,
  pasteText,
  onPasteText,
  onFileSelected,
  onUsePaste,
}: {
  table: ParsedTable | null;
  pasteText: string;
  onPasteText: (value: string) => void;
  onFileSelected: (file: File) => void;
  onUsePaste: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="import-file">Upload CSV or XLSX</Label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
        <p className="text-xs text-slate-500">The first row must be the header row.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="import-paste">…or paste a table (Excel/Google Sheets)</Label>
        <Textarea
          id="import-paste"
          rows={5}
          placeholder={"Name\tCountry\nAcme\tVN"}
          value={pasteText}
          onChange={(event) => onPasteText(event.target.value)}
        />
        <Button variant="outline" size="sm" onClick={onUsePaste} disabled={pasteText.trim() === ""}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Use pasted table
        </Button>
      </div>
      {table ? (
        <div className="lg:col-span-2" aria-live="polite">
          <div className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Parsed {table.rows.length} rows × {table.headers.length} columns.
          </div>
          {table.errors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 pl-8 text-xs text-amber-800">
              {table.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StepPreview({ table }: { table: ParsedTable }) {
  const rows = table.rows.slice(0, PREVIEW_LIMIT);
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Preview of the first {rows.length} of {table.rows.length} rows.
      </p>
      <div className="max-h-96 overflow-auto rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {table.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-slate-400">{rowIndex + 1}</TableCell>
                {table.headers.map((header) => (
                  <TableCell key={header} className="whitespace-nowrap text-xs">
                    {row[header]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StepMapping({
  kind,
  headers,
  mapping,
  onMapping,
}: {
  kind: ImportKind;
  headers: string[];
  mapping: ColumnMapping;
  onMapping: (mapping: ColumnMapping) => void;
}) {
  const template = IMPORT_TEMPLATES[kind];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Match each template field to a file column. Suggestions are prefilled
          (case- and diacritic-insensitive, incl. Vietnamese headers).
        </p>
        <Button variant="outline" size="sm" onClick={() => onMapping(autoMapColumns(headers, template))}>
          Re-run auto-map
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {template.columns.map((column) => {
          const missing = column.required && !mapping[column.key];
          return (
            <div key={column.key} className="space-y-1">
              <Label htmlFor={`map-${column.key}`}>
                {column.label}{" "}
                {column.required ? <span className="text-red-600" aria-hidden="true">*</span> : null}
              </Label>
              <Select
                value={mapping[column.key] ?? UNMAPPED}
                onValueChange={(value) => onMapping({ ...mapping, [column.key]: value === UNMAPPED ? null : value })}
              >
                <SelectTrigger id={`map-${column.key}`} aria-invalid={missing || undefined}
                  className={missing ? "border-red-300" : undefined}>
                  <SelectValue placeholder="— not mapped —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNMAPPED}>— not mapped —</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {missing ? <p className="text-xs text-red-600">Required field — choose a column.</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepValidation({
  summary,
  mappedRows,
  kind,
  importValidOnly,
  onImportValidOnly,
}: {
  summary: ImportSummary;
  mappedRows: Record<string, string>[];
  kind: ImportKind;
  importValidOnly: boolean;
  onImportValidOnly: (value: boolean) => void;
}) {
  const template = IMPORT_TEMPLATES[kind];
  const labelOf = (path: string) =>
    template.columns.find((column) => column.key === path)?.label ?? path;
  return (
    <div className="space-y-3">
      <div
        role="status"
        className={`rounded-md border p-3 text-sm ${
          summary.invalid === 0
            ? "border-teal-200 bg-teal-50 text-teal-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {summary.invalid === 0
          ? `All ${summary.total} rows are valid.`
          : `${summary.invalid} of ${summary.total} rows have validation errors.`}
      </div>
      {summary.invalid > 0 ? (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-navy-900"
              checked={importValidOnly}
              onChange={(event) => onImportValidOnly(event.target.checked)}
            />
            Import valid rows only ({summary.valid} of {summary.total}); error rows are skipped and reported.
          </label>
          {!importValidOnly ? (
            <p className="text-xs text-red-600">
              With this option off, the import aborts entirely when any row is invalid.
            </p>
          ) : null}
          <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.rows.map((row) => (
                  <TableRow key={row.rowIndex}>
                    <TableCell className="font-mono text-xs">{row.rowIndex + 1}</TableCell>
                    <TableCell>
                      <ul className="space-y-0.5 text-xs text-red-700">
                        {row.errors.map((error, index) => (
                          <li key={index}>
                            <span className="font-medium">{labelOf(error.path)}</span>: {error.message}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
      <p className="text-xs text-slate-500">
        Rows validated against the domain schemas ({mappedRows.length} rows). Reference columns
        (ids or exact names) are resolved during the import; unresolved references become row errors.
      </p>
    </div>
  );
}

function StepDuplicates({
  loading,
  hits,
  dupRows,
  mappedRows,
  skips,
  onDecision,
  onRetry,
}: {
  loading: boolean;
  hits: ImportDuplicateHit[] | null;
  dupRows: Array<[number, ImportDuplicateHit[]]>;
  mappedRows: Record<string, string>[];
  skips: Set<number>;
  onDecision: (rowIndex: number, skip: boolean) => void;
  onRetry: () => void;
}) {
  if (loading || hits === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Scoring rows against existing records…
      </div>
    );
  }
  if (dupRows.length === 0) {
    return (
      <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800" role="status">
        No duplicate candidates found — every row looks new.
      </div>
    );
  }
  const nameCell = (rowIndex: number) => {
    const row = mappedRows[rowIndex];
    return row?.name ?? row?.fullName ?? row?.code ?? `row ${rowIndex + 1}`;
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {dupRows.length} row{dupRows.length === 1 ? "" : "s"} look similar to existing records.
          Choose <span className="font-medium">skip</span> or{" "}
          <span className="font-medium">import anyway</span> per row.
        </p>
        <Button variant="ghost" size="sm" onClick={onRetry}>Re-run check</Button>
      </div>
      <div className="space-y-3">
        {dupRows.map(([rowIndex, rowHits]) => (
          <fieldset key={rowIndex} className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-900">
              Row {rowIndex + 1}: {nameCell(rowIndex)}
            </legend>
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {rowHits.map((hit) => (
                <span key={hit.candidateId} className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <span className="font-medium text-slate-800">{hit.candidateName}</span>
                  <Badge variant="warning">{Math.round(hit.score * 100)}%</Badge>
                  {hit.matchedOn.map((reason) => (
                    <Badge key={reason} variant="outline" className="text-[10px]">{reason}</Badge>
                  ))}
                </span>
              ))}
            </div>
            <div className="flex gap-4 text-sm" role="radiogroup" aria-label={`Decision for row ${rowIndex + 1}`}>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`dup-${rowIndex}`}
                  checked={skips.has(rowIndex)}
                  onChange={() => onDecision(rowIndex, true)}
                  className="accent-navy-900"
                />
                Skip this row
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`dup-${rowIndex}`}
                  checked={!skips.has(rowIndex)}
                  onChange={() => onDecision(rowIndex, false)}
                  className="accent-navy-900"
                />
                Import anyway
              </label>
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function StepVisibility({
  visibility,
  onVisibility,
}: {
  visibility: "tenant_private" | "canonical";
  onVisibility: (value: "tenant_private" | "canonical") => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-900">Which layer should these records land in?</legend>
      <label className="flex items-start gap-2.5 rounded-md border border-slate-200 p-3 text-sm">
        <input
          type="radio"
          name="visibility"
          className="mt-0.5 accent-navy-900"
          checked={visibility === "tenant_private"}
          onChange={() => onVisibility("tenant_private")}
        />
        <span>
          <span className="font-medium">Tenant-private (default)</span>
          <span className="block text-xs text-slate-500">
            Visible only inside this workspace. Right choice for quotes, contacts and field intelligence.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
        <input
          type="radio"
          name="visibility"
          className="mt-0.5 accent-amber-700"
          checked={visibility === "canonical"}
          onChange={() => onVisibility("canonical")}
        />
        <span>
          <span className="font-medium text-amber-900">Canonical staging</span>
          <span className="block text-xs text-amber-800">
            Canonical records are shared reference data visible to every tenant. They require analyst
            review before they are treated as verified fact — import here only for vetted reference data.
          </span>
        </span>
      </label>
    </fieldset>
  );
}

function StepConfirm({
  kind,
  fileName,
  summary,
  dupSkipCount,
  visibility,
  importValidOnly,
}: {
  kind: ImportKind;
  fileName: string;
  summary: ImportSummary;
  dupSkipCount: number;
  visibility: string;
  importValidOnly: boolean;
}) {
  const rows: Array<[string, string]> = [
    ["Template", IMPORT_TEMPLATES[kind].label],
    ["File", fileName],
    ["Rows", `${summary.total} total · ${summary.valid} valid · ${summary.invalid} with errors`],
    ["Skipped after duplicate review", String(dupSkipCount)],
    ["Visibility", visibility],
    ["Error policy", importValidOnly ? "Import valid rows, report the rest" : "Abort on any error"],
  ];
  return (
    <div className="space-y-3">
      <Table>
        <TableBody>
          {rows.map(([label, value]) => (
            <TableRow key={label}>
              <TableCell className="w-56 font-medium text-slate-700">{label}</TableCell>
              <TableCell>{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Idempotency: re-importing the same file with the same mapping skips exact duplicates
        (normalized per-kind keys, e.g. name+country for organizations, catalogue number for SKUs),
        so re-runs are safe. A batch source record and an audit entry are written with the row-level report.
      </p>
    </div>
  );
}

function StepReport({ result, kind }: { result: RunImportResult; kind: ImportKind }) {
  if (!result.ok) {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Import aborted — nothing was written.</p>
        <p className="mt-1">{result.message}</p>
      </div>
    );
  }
  const report: ImportReport = result.report;
  const errorRows = report.rows.filter((row) => row.status === "error");
  const errorsCsv = toCsv(
    errorRows.flatMap((row) =>
      row.errors && row.errors.length > 0
        ? row.errors.map((error) => ({
            row: row.rowIndex + 1,
            field: error.path,
            message: error.message,
          }))
        : [{ row: row.rowIndex + 1, field: "", message: row.message ?? "error" }],
    ),
    [
      { key: "row", header: "Row", value: (r) => r.row },
      { key: "field", header: "Field", value: (r) => r.field },
      { key: "message", header: "Message", value: (r) => r.message },
    ],
  );

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-center">
          <div className="text-2xl font-semibold text-teal-700">{report.created}</div>
          <div className="text-xs text-teal-800">rows created ({report.createdEntityIds.length} records)</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
          <div className="text-2xl font-semibold text-slate-700">{report.skipped}</div>
          <div className="text-xs text-slate-600">rows skipped (duplicates / review)</div>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center">
          <div className="text-2xl font-semibold text-red-700">{report.failed}</div>
          <div className="text-xs text-red-800">rows with errors</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Batch <code className="font-mono">{report.batchId.slice(0, 8)}</code> · source record{" "}
          <code className="font-mono">{report.sourceRecordId.slice(0, 8)}</code> ·{" "}
          {IMPORT_TEMPLATES[kind].label} · {report.visibility}
        </span>
        {errorRows.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTextFile(`import-errors-${report.batchId.slice(0, 8)}.csv`, errorsCsv)}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download errors (CSV)
          </Button>
        ) : null}
      </div>

      <div className="max-h-80 overflow-auto rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={row.rowIndex}>
                <TableCell className="font-mono text-xs">{row.rowIndex + 1}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.status === "created" ? "success" : row.status === "skipped" ? "secondary" : "destructive"}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-600">
                  {row.message ??
                    (row.entityIds ? `${row.entityIds.length} record(s): ${row.entityIds.map((id) => id.slice(0, 8)).join(", ")}` : "—")}
                  {row.errors && row.errors.length > 0 ? (
                    <ul className="mt-0.5 space-y-0.5 text-red-700">
                      {row.errors.map((error, index) => (
                        <li key={index}>
                          {error.path}: {error.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
