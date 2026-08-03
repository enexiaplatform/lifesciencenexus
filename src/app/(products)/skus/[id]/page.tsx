import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  AvailabilityBadge,
  ClassificationBadge,
  DomainEvidenceBadge,
  EntityBadges,
  FreshnessBadge,
  ProductStatusBadge,
  SyntheticBadge,
} from "@/components/products/badges";
import { EdgePanels, type SourceInfo } from "@/components/products/edge-panels";
import { EntityRefLink } from "@/components/products/entity-link";
import { ConfidenceValue, DateText, formatMoney, formatUnitAmount, humanize, Money } from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { SkuActions } from "@/components/products/sku-actions";
import { SourceChip } from "@/components/products/source-chip";
import { Badge } from "@/components/ui/badge";
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
import { aggregateConfidence } from "@/lib/domain/confidence";
import { priceFreshness } from "@/lib/domain/price-normalization";
import { normalizePack } from "@/lib/domain/units";
import { demoTenantId } from "@/lib/env";
import type { BuildMemoireHandoffInput } from "@/lib/integrations/memoire";

import { addSkuToResearchProject } from "./actions";

export const metadata = { title: "SKU details" };

export default async function SkuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getRepository();
  const detail = await repo.getSkuDetail(id);
  if (!detail) notFound();

  const { sku, product, family, brand, manufacturer, format, packConfigurations, edges, listings, prices, documents } = detail;

  const [organizations, availability, equivalences, sources, projects, allSkus, successorSku] =
    await Promise.all([
      repo.list("organization", { pageSize: 500 }),
      repo.list("availability_observation", {
        filters: { skuId: sku.id },
        sort: { field: "observedAt", direction: "desc" },
        pageSize: 50,
      }),
      repo.list("equivalence_record", { pageSize: 100 }),
      repo.list("source", { pageSize: 500 }),
      repo.list("research_project", { pageSize: 100 }),
      repo.list("sku", { pageSize: 500 }),
      sku.successorSkuId ? repo.getById("sku", sku.successorSkuId) : null,
    ]);

  const orgById = new Map(organizations.items.map((org) => [org.id, org]));
  const skuById = new Map(allSkus.items.map((candidate) => [candidate.id, candidate]));
  const sourceById = new Map<string, SourceInfo>(
    sources.items.map((source) => [source.id, { id: source.id, title: source.title, type: source.type }]),
  );

  const involving = equivalences.items.filter(
    (record) => record.sourceSkuId === sku.id || record.candidateSkuId === sku.id,
  );

  const latestPrice = prices[0] ?? null;

  // Memoire handoff payload input — evidence references from edge + price provenance.
  const evidenceRefs: BuildMemoireHandoffInput["entity"]["evidenceRefs"] = [];
  const seenRef = new Set<string>();
  const pushRef = (sourceId: string | undefined, state: (typeof evidenceRefs)[number]["evidenceState"]) => {
    if (!sourceId || seenRef.has(sourceId)) return;
    const source = sourceById.get(sourceId);
    if (!source) return;
    seenRef.add(sourceId);
    evidenceRefs.push({
      sourceId,
      sourceType: source.type as (typeof evidenceRefs)[number]["sourceType"],
      evidenceState: state,
    });
  };
  for (const edge of edges) pushRef(edge.evidence.sourceId, edge.evidence.state);
  for (const price of prices) pushRef(price.sourceId, price.evidenceState);

  const keyFacts: Record<string, string> = {
    status: sku.status,
    countryAvailability: sku.countryAvailability.join(", ") || "not recorded",
    supplierListings: listings.length > 0
      ? listings.map((listing) => listing.supplierName ?? listing.supplierOrgId).join(", ")
      : "none recorded",
    latestObservedPrice: latestPrice
      ? `${formatMoney(latestPrice.originalAmount, latestPrice.originalCurrency)} on ${latestPrice.observationDate}`
      : "none recorded",
  };
  if (sku.catalogueNumber) keyFacts.catalogueNumber = sku.catalogueNumber;
  if (sku.manufacturerCode) keyFacts.manufacturerCode = sku.manufacturerCode;
  if (sku.gtin) keyFacts.gtin = sku.gtin;
  if (format) keyFacts.format = format.name;
  if (sku.shelfLifeMonths !== undefined) keyFacts.shelfLifeMonths = `${sku.shelfLifeMonths} months`;
  if (sku.storageCondition) keyFacts.storageCondition = sku.storageCondition;

  const handoffInput: BuildMemoireHandoffInput = {
    tenantId: demoTenantId,
    entityUrl: `/skus/${sku.id}`,
    entity: {
      nexusEntityId: sku.id,
      entityType: "sku",
      displayName: sku.name,
      summary: `SKU of ${product?.name ?? "unknown product"} (${manufacturer?.name ?? "unknown manufacturer"}). ${edges.length} evidence-backed links, ${listings.length} supplier listings, ${prices.length} price observations.`,
      keyFacts,
      evidenceRefs: evidenceRefs.slice(0, 12),
    },
    suggestedAction: {
      kind: "create_opportunity_note",
      label: "Open an opportunity note for this SKU in Memoire",
    },
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <Link href="/products" className="hover:text-accent hover:underline">
          Products
        </Link>
        {brand ? (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span>{brand.name}</span>
          </>
        ) : null}
        {family ? (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span>{family.name}</span>
          </>
        ) : null}
        {product ? (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <EntityRefLink
              entityRef={{ entityType: "product", entityId: product.id }}
              label={product.name}
              className="hover:text-accent hover:underline"
            />
          </>
        ) : null}
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium text-slate-700">{sku.name}</span>
      </nav>

      <PageHeader
        title={sku.name}
        badges={
          <>
            <ProductStatusBadge status={sku.status} />
            <EntityBadges visibility={sku.visibility} isDemo={sku.isDemo} />
          </>
        }
        actions={
          <SkuActions
            skuId={sku.id}
            skuName={sku.name}
            projects={projects.items.map((project) => ({ id: project.id, title: project.title }))}
            handoffInput={handoffInput}
            addToProject={addSkuToResearchProject}
          />
        }
      />

      {/* Identifiers & lifecycle */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Identifiers &amp; lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Catalogue number</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-slate-800">{sku.catalogueNumber ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Manufacturer code</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-slate-800">{sku.manufacturerCode ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">GTIN</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-slate-800">{sku.gtin ?? "—"}</dd>
            </div>
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
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Format</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{format?.name ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Shelf life</dt>
              <dd className="mt-0.5 text-sm tabular-nums text-slate-800">
                {sku.shelfLifeMonths !== undefined ? `${sku.shelfLifeMonths} months` : "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Storage condition</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{sku.storageCondition ?? "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Successor SKU</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {successorSku ? (
                  <EntityRefLink
                    entityRef={{ entityType: "sku", entityId: successorSku.id }}
                    label={successorSku.name}
                    className="text-accent hover:underline"
                  />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Country availability</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1">
                {sku.countryAvailability.length === 0 ? (
                  <span className="text-slate-500">—</span>
                ) : (
                  sku.countryAvailability.map((country) => (
                    <Badge key={country} variant="secondary">
                      {country}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
            {sku.alternateNames.length > 0 ? (
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Also known as</dt>
                <dd className="mt-0.5 text-xs text-slate-600">{sku.alternateNames.join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Pack configurations */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Pack configurations ({packConfigurations.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {packConfigurations.length === 0 ? (
            <p className="text-sm text-slate-500">No pack configuration recorded — per-unit price normalization is not possible.</p>
          ) : (
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Content</TableHead>
                  <TableHead className="text-right">Units per pack</TableHead>
                  <TableHead>Normalized</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packConfigurations.map((pack) => {
                  const normalized = normalizePack({
                    quantity: pack.quantity,
                    unit: pack.unit,
                    unitsPerPack: pack.unitsPerPack,
                  });
                  return (
                    <TableRow key={pack.id}>
                      <TableCell className="text-slate-700">{pack.description ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">
                        {pack.quantity} {pack.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">
                        {pack.unitsPerPack ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {normalized ? (
                          <span title={normalized.warnings.join("; ") || undefined}>{normalized.label}</span>
                        ) : (
                          <span className="italic text-slate-400">unparseable unit</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Evidence panels */}
      <section aria-label="Evidence-backed links">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Evidence-backed links</h2>
        {edges.length === 0 ? (
          <p className="text-xs text-slate-500">
            No evidence edges recorded for this SKU&apos;s product — applications, standards and
            organisms appear here once sources are captured.
          </p>
        ) : (
          <EdgePanels edges={edges} sources={sourceById} />
        )}
      </section>

      {/* Supplier listings & availability */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Supplier listings ({listings.length})</CardTitle>
            <CardDescription className="text-xs">Who claims to sell this SKU, with evidence</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {listings.length === 0 ? (
              <p className="text-sm text-slate-500">No supplier listing recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {listings.map((listing) => {
                  const source = listing.evidence.sourceId
                    ? sourceById.get(listing.evidence.sourceId)
                    : undefined;
                  return (
                    <li key={listing.id} className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <EntityRefLink
                          entityRef={{ entityType: "organization", entityId: listing.supplierOrgId }}
                          label={listing.supplierName ?? listing.supplierOrgId}
                          className="text-sm font-medium text-accent hover:underline"
                        />
                        <Badge variant="secondary" className="font-normal">
                          {humanize(listing.relationshipType)}
                        </Badge>
                        <DomainEvidenceBadge state={listing.evidence.state} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <ConfidenceValue value={listing.evidence.confidence} />
                        <SourceChip
                          sourceId={listing.evidence.sourceId}
                          title={source?.title}
                          type={source?.type}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Availability observations ({availability.items.length})</CardTitle>
            <CardDescription className="text-xs">Point-in-time stock observations per supplier</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {availability.items.length === 0 ? (
              <p className="text-sm text-slate-500">No availability observation recorded.</p>
            ) : (
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Observed</TableHead>
                    <TableHead className="text-right">Lead time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability.items.map((observation) => (
                    <TableRow key={observation.id}>
                      <TableCell className="text-slate-700">
                        {orgById.get(observation.supplierOrgId)?.name ?? observation.supplierOrgId}
                      </TableCell>
                      <TableCell>
                        <AvailabilityBadge status={observation.status} />
                      </TableCell>
                      <TableCell className="text-slate-600">{observation.country}</TableCell>
                      <TableCell>
                        <DateText date={observation.observedAt} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">
                        {observation.leadTimeDays !== undefined ? `${observation.leadTimeDays} d` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price observations */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Price observations ({prices.length})</CardTitle>
          <CardDescription className="text-xs">
            Immutable observed quotes, newest first. Normalized values are engine-derived; synthetic
            observations are marked.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {prices.length === 0 ? (
            <p className="text-sm text-slate-500">
              No price observed yet — record one from the{" "}
              <Link href="/prices" className="text-accent hover:underline">
                Prices
              </Link>{" "}
              module.
            </p>
          ) : (
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Incoterm</TableHead>
                  <TableHead className="text-right">Per unit</TableHead>
                  <TableHead>Freshness</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((price) => {
                  const freshness = priceFreshness(price.observationDate);
                  return (
                    <TableRow key={price.id}>
                      <TableCell>
                        <DateText date={price.observationDate} />
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {price.supplierOrgId
                          ? (orgById.get(price.supplierOrgId)?.name ?? price.supplierOrgId)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money amount={price.originalAmount} currency={price.originalCurrency} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {price.taxIncluded
                          ? price.vatRate !== undefined
                            ? `incl. VAT ${Math.round(price.vatRate * 100)}%`
                            : "tax incl."
                          : price.vatRate !== undefined
                            ? `excl. VAT ${Math.round(price.vatRate * 100)}%`
                            : "no tax info"}
                      </TableCell>
                      <TableCell className="text-slate-600">{price.incoterm ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-700">
                        {price.normalizedPerUnitAmount != null && price.normalizedPerUnitCurrency
                          ? formatUnitAmount(
                              price.normalizedPerUnitAmount,
                              price.normalizedPerUnitCurrency,
                              price.normalizedPerUnit,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <FreshnessBadge bucket={freshness.bucket} daysSince={freshness.daysSince} />
                      </TableCell>
                      <TableCell>
                        <ConfidenceValue value={aggregateConfidence(price.confidence)} />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex flex-wrap gap-1">
                          <EntityBadges visibility={price.visibility} isDemo={price.isDemo} />
                          {price.isSynthetic ? <SyntheticBadge /> : null}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Equivalence records */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Equivalence records ({involving.length})</CardTitle>
          <CardDescription className="text-xs">
            Assessed equivalences where this SKU is the source or the candidate
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {involving.length === 0 ? (
            <p className="text-sm text-slate-500">
              No equivalence assessment involves this SKU yet — start one from the{" "}
              <Link href="/equivalence" className="text-accent hover:underline">
                Equivalence
              </Link>{" "}
              module.
            </p>
          ) : (
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Other SKU</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Review state</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {involving.map((record) => {
                  const isSource = record.sourceSkuId === sku.id;
                  const otherId = isSource ? record.candidateSkuId : record.sourceSkuId;
                  const other = skuById.get(otherId);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs text-slate-600">
                        {isSource ? "Source" : "Candidate"}
                      </TableCell>
                      <TableCell>
                        <EntityRefLink
                          entityRef={{ entityType: "sku", entityId: otherId }}
                          label={other?.name ?? otherId}
                          className="font-medium text-accent hover:underline"
                        />
                      </TableCell>
                      <TableCell>
                        <ClassificationBadge classification={record.classification} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">
                        {record.overallScore.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <DomainEvidenceBadge state={record.reviewState} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/equivalence/${record.id}`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Open workspace
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents linked to this SKU.</p>
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
    </div>
  );
}
