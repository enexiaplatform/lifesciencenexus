import { demoTenantId } from "@/lib/env";
import { ExportCenter } from "@/components/ops/export-center";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export const metadata = { title: "Exports" };

/**
 * /exports — export center. Downloads stream through /api/exports/[family]
 * route handlers (CSV/JSON/XLSX with Content-Disposition); the visibility
 * guard and audit logging run server-side.
 */
export default function ExportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exports"
        description="Download entity families for analysis or handoff. Canonical reference data is always exportable; tenant-private intelligence requires an explicit authorization and is written to the audit log."
      />

      <ExportCenter demoTenantId={demoTenantId} />

      <SectionCard title="Authorization & audit">
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-800">Authorization.</span>{" "}
            Exporting tenant-private rows asserts you are the demo workspace
            owner (<code className="font-mono text-xs">{demoTenantId}</code>) —
            the demo equivalent of an export permission. The route enforces it:
            anonymous requests receive canonical rows only.
          </p>
          <p>
            <span className="font-medium text-slate-800">Audit.</span> Every
            download records an <code className="font-mono text-xs">export.download</code>{" "}
            audit entry with family, format, visibility scope and row count.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
