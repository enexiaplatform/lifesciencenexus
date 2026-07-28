import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import { demoTenantId } from "@/lib/env";
import { buildExportRows, isExportFamily } from "@/lib/api/exports";
import { canSeeTenantPrivate } from "@/lib/api/guards";
import { withApi } from "@/lib/api/handler";
import { badRequest, notFound } from "@/lib/api/respond";
import { toCsv, toJsonExport } from "@/lib/domain/export";

interface RouteContext {
  params: Promise<{ family: string }>;
}

const FORMATS = ["csv", "json", "xlsx"] as const;
type ExportFormat = (typeof FORMATS)[number];

/**
 * GET /api/exports/[family]?format=csv|json|xlsx&includeTenantPrivate=true
 *
 * Downloads a full entity family as CSV/JSON/XLSX with Content-Disposition.
 *
 * VISIBILITY GUARD: canonical rows are always exported. tenant_private rows
 * are exported ONLY when explicitly requested (`includeTenantPrivate=true`)
 * AND the caller is authenticated as the owning tenant:
 *   - API callers: `x-nexus-tenant: tenant_demo` header;
 *   - browser downloads (anchor tags can't set headers): in demo mode the
 *     `tenant=tenant_demo` query param is honored as the tenant assertion —
 *     only while no NEXUS_API_KEY is configured; with a key, the header is
 *     mandatory. Every export writes an audit_log_entry (export.download).
 */
export const GET = withApi<RouteContext>("exports", async (request, context, api) => {
  const { family } = await context.params;
  if (!isExportFamily(family)) {
    return notFound(`unknown export family "${family}"`);
  }
  const format = (request.nextUrl.searchParams.get("format") ?? "csv") as ExportFormat;
  if (!(FORMATS as readonly string[]).includes(format)) {
    return badRequest(`format must be one of ${FORMATS.join(", ")}`);
  }

  const wantsTenantPrivate = request.nextUrl.searchParams.get("includeTenantPrivate") === "true";
  const tenantParam = request.nextUrl.searchParams.get("tenant");
  // Demo-only browser path: query param stands in for the tenant header.
  const tenantAsserted =
    canSeeTenantPrivate(api.auth) ||
    (api.auth.mode === "demo" && tenantParam === demoTenantId);
  const includeTenantPrivate = wantsTenantPrivate && tenantAsserted;

  const repo = await getRepository();
  const built = await buildExportRows(repo, family, includeTenantPrivate);

  // Audit every export: who (tenant), what (family/format/scope), how many rows.
  await repo.createEntity("audit_log_entry", {
    tenantId: api.auth.tenantId ?? tenantParam ?? undefined,
    actorId: api.auth.tenantId ? `${api.auth.tenantId}:api` : "anonymous",
    action: "export.download",
    entityType: built.entityType,
    entityId: family,
    at: new Date().toISOString(),
    metadata: {
      family,
      format,
      scope: built.scope,
      requestedTenantPrivate: wantsTenantPrivate,
      tenantPrivateGranted: includeTenantPrivate,
      rowCount: built.rows.length,
    },
    visibility: "tenant_private",
    isDemo: false,
  });

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `nexus-${family}-${date}.${format}`;
  const disposition = `attachment; filename="${fileName}"`;

  if (format === "json") {
    const body = toJsonExport({
      exportedAt: new Date().toISOString(),
      family,
      scope: built.scope,
      rows: built.rows,
    });
    return new NextResponse(body, {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": disposition },
    });
  }

  if (format === "xlsx") {
    const sheet = XLSX.utils.json_to_sheet(built.rows, { header: built.columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, family.slice(0, 31));
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": disposition,
      },
    });
  }

  const csv = toCsv(
    built.rows,
    built.columns.map((key) => ({ key, header: key, value: (row) => row[key] })),
  );
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": disposition },
  });
});
