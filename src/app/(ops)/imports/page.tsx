import { getRepository } from "@/lib/data";
import { ImportWizard } from "@/components/ops/import-wizard";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IMPORT_TEMPLATES, type ImportKind } from "@/lib/imports/templates";

export const metadata = { title: "Imports" };

export const dynamic = "force-dynamic";

interface BatchMetadata {
  batchId?: string;
  kind?: string;
  fileName?: string;
  visibility?: string;
  total?: number;
  created?: number;
  skipped?: number;
  failed?: number;
}

/**
 * /imports — ingestion wizard (9 steps, all client-side state + two server
 * actions) plus the recent import batches list (audit_log_entry records with
 * action "import.batch.completed").
 */
export default async function ImportsPage() {
  const repo = await getRepository();
  const batches = await repo.list("audit_log_entry", {
    filters: { action: "import.batch.completed" },
    sort: { field: "createdAt", direction: "desc" },
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imports"
        description="Bulk-load spreadsheets into the graph: pick a template, upload CSV or XLSX (or paste a table), map columns, validate, review duplicates, choose a visibility layer, and commit. Re-importing the same file with the same mapping is safe — exact duplicates are skipped."
      />

      <ImportWizard />

      <SectionCard
        title="Recent import batches"
        description="Each completed import writes a batch record (source + audit entry) with row-level outcomes."
        flush={batches.items.length > 0}
      >
        {batches.items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No import batches yet — run the wizard above to create the first one.
          </p>
        ) : (
          <Table compact>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Skipped</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead>Finished</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.items.map((batch) => {
                const metadata = (batch.metadata ?? {}) as BatchMetadata;
                const kind = metadata.kind as ImportKind | undefined;
                const template = kind ? IMPORT_TEMPLATES[kind] : undefined;
                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium text-slate-900">
                      {metadata.fileName ?? "(unnamed file)"}
                    </TableCell>
                    <TableCell>{template?.label ?? metadata.kind ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={metadata.visibility === "canonical" ? "secondary" : "warning"}>
                        {metadata.visibility ?? "tenant_private"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success-fg">{metadata.created ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">{metadata.skipped ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-danger-fg">{metadata.failed ?? 0}</TableCell>
                    <TableCell className="tabular-nums text-slate-500">
                      {new Date(batch.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
