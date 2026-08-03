import { getRepository } from "@/lib/data";
import { demoTenantId, integrations } from "@/lib/env";
import {
  ATLAS_READ_CONTRACT_VERSION,
} from "@/lib/integrations/atlas";
import {
  FIELD_OBSERVATION_CONTRACT_VERSION,
  MEMOIRE_HANDOFF_CONTRACT_VERSION,
} from "@/lib/integrations/memoire";
import { MemoireHandoffBuilder, type HandoffEntityOption } from "@/components/integrations/memoire-handoff";
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

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

const ATLAS_ENDPOINTS = ["products", "standards", "applications", "organisms", "suppliers", "methods"];

/** /settings/integrations — Memoire + Atlas integration status and tooling. */
export default async function IntegrationsPage() {
  const repo = await getRepository();

  // Entity picker options for the handoff builder.
  const [orgs, skus, products, signals] = await Promise.all([
    repo.list("organization", { pageSize: 8, sort: { field: "name", direction: "asc" } }),
    repo.list("sku", { pageSize: 8, sort: { field: "name", direction: "asc" } }),
    repo.list("product", { pageSize: 5, sort: { field: "name", direction: "asc" } }),
    repo.listSignals({ pageSize: 5 }),
  ]);
  const entityOptions: HandoffEntityOption[] = [
    ...orgs.items.map((org) => ({ entityType: "organization", entityId: org.id, label: `Org: ${org.name}` })),
    ...skus.items.map((sku) => ({ entityType: "sku", entityId: sku.id, label: `SKU: ${sku.name}` })),
    ...products.items.map((product) => ({
      entityType: "product",
      entityId: product.id,
      label: `Product: ${product.name}`,
    })),
    ...signals.items.map((signal) => ({
      entityType: "market_signal",
      entityId: signal.id,
      label: `Signal: ${signal.type} — ${signal.reason.slice(0, 48)}…`,
    })),
  ];

  const handoffs = await repo.list("outbound_handoff_record", {
    pageSize: 10,
    sort: { field: "createdAt", direction: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Ecosystem boundaries: Memoire (execution layer) receives handoffs from Nexus; Atlas (product knowledge layer) reads vendor-neutral reference data from Nexus."
      />

      <SectionCard
        title="Memoire — outbound handoffs"
        description="Push commercial entities (accounts, SKUs, signals) to the execution layer as contract-valid payloads."
        actions={
          <>
            <Badge variant="warning">
              {integrations.memoireUrl ? "Configured" : "Not configured — deep-link placeholder mode"}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">{MEMOIRE_HANDOFF_CONTRACT_VERSION}</Badge>
          </>
        }
      >
        <div className="space-y-6">
          <MemoireHandoffBuilder entities={entityOptions} tenantId={demoTenantId} />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Outbound handoff log ({handoffs.total})
            </p>
            {handoffs.items.length === 0 ? (
              <p className="text-sm text-slate-500">
                No handoffs recorded yet — build one above to see it here (status: prepared; copied /
                downloaded statuses are recorded as the integration matures).
              </p>
            ) : (
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead>Handoff</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prepared</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {handoffs.items.map((record) => {
                    const payload = record.payload as {
                      handoffId?: string;
                      entity?: { displayName?: string; entityType?: string };
                      suggestedAction?: { label?: string };
                    };
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs">
                          {(payload.handoffId ?? record.id).slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payload.entity?.displayName ?? "—"}
                          <span className="ml-1.5 text-xs text-slate-400">{payload.entity?.entityType}</span>
                        </TableCell>
                        <TableCell className="text-xs">{payload.suggestedAction?.label ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "prepared" ? "secondary" : "success"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-slate-500">
                          {new Date(record.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Memoire — field observation return path"
          description="Future: field reps push observations back into Nexus."
          actions={<Badge variant="outline">draft</Badge>}
        >
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              Contract <code className="font-mono text-xs">{FIELD_OBSERVATION_CONTRACT_VERSION}</code>{" "}
              is specified and schema-enforced but not yet wired to an endpoint.
            </p>
            <p className="text-xs text-slate-500">
              Governance is encoded in the contract itself: observations always arrive{" "}
              <span className="font-medium">tenant_private</span> and{" "}
              <span className="font-medium">unverified</span> — they can never enter the graph as
              canonical facts without analyst review.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Atlas — read-only reference API"
          description="Canonical reference data Nexus serves to Atlas."
          actions={
            <>
              <Badge variant="success">read-only</Badge>
              <Badge variant="outline" className="font-mono text-xs">{ATLAS_READ_CONTRACT_VERSION}</Badge>
            </>
          }
        >
          <div className="space-y-3 text-sm text-slate-600">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">Vendor neutrality:</span> Atlas has{" "}
              <code className="font-mono">selectsVendor = false</code> and{" "}
              <code className="font-mono">assertsProductEquivalence = false</code> — Nexus never sends
              prices, commercial terms or equivalence verdicts to Atlas. Every payload passes a guard
              that strips such fields before leaving.
            </p>
            <ul className="grid grid-cols-2 gap-1.5 text-xs">
              {ATLAS_ENDPOINTS.map((endpoint) => (
                <li key={endpoint}>
                  <a
                    href={`/api/v1/integrations/atlas/${endpoint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    /api/v1/integrations/atlas/{endpoint}
                  </a>
                </li>
              ))}
              <li>
                <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  /api/v1/openapi.json
                </a>
              </li>
            </ul>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
