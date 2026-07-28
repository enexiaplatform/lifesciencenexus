import { demoTenantId } from "@/lib/env";
import { ExportCenter } from "@/components/ops/export-center";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Exports" };

/**
 * /exports — export center. Downloads stream through /api/exports/[family]
 * route handlers (CSV/JSON/XLSX with Content-Disposition); the visibility
 * guard and audit logging run server-side.
 */
export default function ExportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Exports</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Download entity families for analysis or handoff. Canonical reference
          data is always exportable; tenant-private intelligence requires an
          explicit authorization and is written to the audit log.
        </p>
      </div>

      <ExportCenter demoTenantId={demoTenantId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authorization &amp; audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
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
        </CardContent>
      </Card>
    </div>
  );
}
