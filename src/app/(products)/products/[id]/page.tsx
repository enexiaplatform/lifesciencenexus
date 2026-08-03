import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  CategoryBadge,
  EntityBadges,
  ProductStatusBadge,
} from "@/components/products/badges";
import { EdgePanels, type EdgeWithName, type SourceInfo } from "@/components/products/edge-panels";
import { EntityRefLink } from "@/components/products/entity-link";
import { PageHeader } from "@/components/products/page-header";
import { SourceChip } from "@/components/products/source-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { humanize } from "@/components/products/format";

export const metadata = { title: "Product details" };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getProductDetail(id);
  if (!detail) notFound();

  const { product, family, brand, manufacturer, skus, edges, documents } = detail;

  // Resolve edge target display names from the reference datasets.
  const [applications, methods, standards, organisms, sampleTypes, industries, testTypes, incubation, preparation, sources, packs, successor, predecessor] =
    await Promise.all([
      repo.list("application", { pageSize: 500 }),
      repo.list("method", { pageSize: 500 }),
      repo.list("standard", { pageSize: 500 }),
      repo.list("organism", { pageSize: 500 }),
      repo.list("sample_type", { pageSize: 500 }),
      repo.list("industry", { pageSize: 500 }),
      repo.list("test_type", { pageSize: 500 }),
      repo.list("incubation_condition", { pageSize: 500 }),
      repo.list("preparation_method", { pageSize: 500 }),
      repo.list("source", { pageSize: 500 }),
      repo.list("pack_configuration", { pageSize: 500 }),
      product.successorProductId ? repo.getById("product", product.successorProductId) : null,
      product.predecessorProductId ? repo.getById("product", product.predecessorProductId) : null,
    ]);

  const nameByKey = new Map<string, string>();
  for (const a of applications.items) nameByKey.set(`application:${a.id}`, a.name);
  for (const m of methods.items) nameByKey.set(`method:${m.id}`, m.name);
  for (const s of standards.items) nameByKey.set(`standard:${s.id}`, `${s.body} ${s.code}`);
  for (const o of organisms.items)
    nameByKey.set(`organism:${o.id}`, [o.genus, o.species, o.strainCode].filter(Boolean).join(" "));
  for (const s of sampleTypes.items) nameByKey.set(`sample_type:${s.id}`, s.name);
  for (const i of industries.items) nameByKey.set(`industry:${i.id}`, i.name);
  for (const t of testTypes.items) nameByKey.set(`test_type:${t.id}`, t.name);
  for (const c of incubation.items)
    nameByKey.set(`incubation_condition:${c.id}`, c.description ?? c.id);
  for (const p of preparation.items) nameByKey.set(`preparation_method:${p.id}`, p.name);

  const edgesWithNames: EdgeWithName[] = edges.map((edge) => ({
    ...edge,
    targetName: nameByKey.get(`${edge.targetType}:${edge.targetId}`) ?? null,
  }));

  const sourceById = new Map<string, SourceInfo>(
    sources.items.map((source) => [source.id, { id: source.id, title: source.title, type: source.type }]),
  );

  const packCountBySku = new Map<string, number>();
  const firstPackBySku = new Map<string, string>();
  for (const pack of packs.items) {
    packCountBySku.set(pack.skuId, (packCountBySku.get(pack.skuId) ?? 0) + 1);
    if (!firstPackBySku.has(pack.skuId)) {
      firstPackBySku.set(
        pack.skuId,
        pack.description ?? `${pack.quantity} ${pack.unit}${pack.unitsPerPack ? ` × ${pack.unitsPerPack}` : ""}`,
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Chain breadcrumb: brand → family → product */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <Link href="/products" className="hover:text-accent hover:underline">
          Products
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span>{brand?.name ?? "Unknown brand"}</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span>{family?.name ?? "Unknown family"}</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium text-slate-700">{product.name}</span>
      </nav>

      <PageHeader
        title={product.name}
        description={product.description}
        badges={
          <>
            <ProductStatusBadge status={product.status} />
            <CategoryBadge category={product.category} />
            <EntityBadges visibility={product.visibility} isDemo={product.isDemo} />
          </>
        }
      />

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Classification &amp; lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Manufacturer</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {manufacturer ? (
                  <EntityRefLink
                    entityRef={{ entityType: "organization", entityId: manufacturer.id }}
                    label={manufacturer.name}
                    className="text-accent hover:underline"
                  />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Brand</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{brand?.name ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Family</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{family?.name ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="mt-0.5 text-sm">
                <ProductStatusBadge status={product.status} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Successor product</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {successor ? (
                  <EntityRefLink
                    entityRef={{ entityType: "product", entityId: successor.id }}
                    label={successor.name}
                    className="text-accent hover:underline"
                  />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Predecessor product</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {predecessor ? (
                  <EntityRefLink
                    entityRef={{ entityType: "product", entityId: predecessor.id }}
                    label={predecessor.name}
                    className="text-accent hover:underline"
                  />
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">SKUs ({skus.length})</CardTitle>
          <CardDescription className="text-xs">
            Sellable variants of this product — open a SKU for pack, price and availability detail
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {skus.length === 0 ? (
            <p className="text-sm text-slate-500">No SKUs recorded for this product.</p>
          ) : (
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Catalogue number</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <TableRow key={sku.id} className={sku.status === "discontinued" ? "bg-danger-bg/50" : ""}>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {sku.catalogueNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <EntityRefLink
                        entityRef={{ entityType: "sku", entityId: sku.id }}
                        label={sku.name}
                        className="font-medium text-accent hover:underline"
                      />
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {firstPackBySku.get(sku.id) ?? "—"}
                      {(packCountBySku.get(sku.id) ?? 0) > 1
                        ? ` (+${(packCountBySku.get(sku.id) ?? 0) - 1} more)`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={sku.status} />
                    </TableCell>
                    <TableCell>
                      <EntityBadges visibility={sku.visibility} isDemo={sku.isDemo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <section aria-label="Evidence">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Evidence-backed links</h2>
        <EdgePanels edges={edgesWithNames} sources={sourceById} />
      </section>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents linked to this product.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const source = sourceById.get(doc.sourceId);
                return (
                  <li key={doc.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[11px] font-medium uppercase text-navy-700">
                      {humanize(doc.docType)}
                    </span>
                    <span className="flex-1 text-sm text-slate-800">{doc.title}</span>
                    <SourceChip sourceId={doc.sourceId} title={source?.title} type={source?.type} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {edges.length > 0 ? null : (
        <p className="text-xs text-slate-500">
          No evidence-backed links recorded yet for this product — applications, standards and
          organisms appear here once sources are captured.
        </p>
      )}
    </div>
  );
}
