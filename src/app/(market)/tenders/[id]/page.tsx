import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Gavel, Users } from "lucide-react";

import { DemoBadge, EvidenceStateBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { Breadcrumb } from "@/components/market/breadcrumb";
import { DetailGrid, DetailItem } from "@/components/market/description-list";
import { EmptyState } from "@/components/market/empty-state";
import {
  TENDER_EVENT_TYPE_LABELS,
  TENDER_STATUS_LABELS,
  countryName,
  formatConfidence,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/components/market/labels";
import { SignalList } from "@/components/market/signal-list";
import { SourceChip } from "@/components/market/source-chip";
import { Timeline } from "@/components/market/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCard } from "@/components/ui/section-card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { daysUntil } from "@/lib/domain/freshness";

import { addTenderBidder, addTenderItem, addTenderLot, recordTenderAward } from "./actions";
import { AddBidderForm, AddItemForm, AddLotForm, RecordAwardForm } from "./tender-forms";

export const dynamic = "force-dynamic";

/** Whole-calendar-month arithmetic on ISO dates (contract end estimation). */
function addMonthsIso(dateIso: string, months: number): string {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();

  const detail = await repo.getTenderDetail(id);
  if (!detail) notFound();
  const { tender, buyer, lots, items, bidders, awards, events } = detail;

  const [site, source, sourceDocuments, orgs, products, skus, signals] = await Promise.all([
    tender.siteId ? repo.getById("site", tender.siteId) : Promise.resolve(null),
    repo.getById("source", tender.sourceId),
    repo.list("source_document", { filters: { sourceId: tender.sourceId }, pageSize: 50 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("product", { pageSize: 500 }),
    repo.list("sku", { pageSize: 500 }),
    repo.listSignals({ pageSize: 100 }),
  ]);

  const orgById = new Map(orgs.items.map((org) => [org.id, org]));
  const productById = new Map(products.items.map((product) => [product.id, product]));
  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const itemById = new Map(items.map((item) => [item.id, item]));

  const relatedSignals = signals.items.filter((signal) =>
    signal.relatedEntities.some((entity) => entity.entityType === "tender" && entity.entityId === id),
  );

  const contractEnd =
    tender.awardDate && tender.contractPeriodMonths
      ? addMonthsIso(tender.awardDate, tender.contractPeriodMonths)
      : null;
  const daysToContractEnd = contractEnd ? daysUntil(contractEnd) : null;
  const renewalWindow = daysToContractEnd !== null && daysToContractEnd >= 0 && daysToContractEnd <= 120;

  const organizationOptions = orgs.items
    .map((org) => ({ value: org.id, label: org.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const skuOptions = skus.items
    .map((sku) => ({
      value: sku.id,
      label: sku.catalogueNumber ? `${sku.name} (${sku.catalogueNumber})` : sku.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const productOptions = products.items
    .map((product) => ({ value: product.id, label: product.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const lotOptions = lots.map((lot) => ({ value: lot.id, label: lot.name }));
  const itemOptions = items.map((item) => ({
    value: item.id,
    label: `${lotById.get(item.lotId)?.name ?? "Lot"}: ${item.description.slice(0, 60)}`,
  }));

  const sortedEvents = [...events].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Tenders", href: "/tenders" }, { label: tender.code }]} />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">
              <span className="font-mono text-base text-slate-500">{tender.code}</span> — {tender.title}
            </CardTitle>
            <StatusBadge
              label={TENDER_STATUS_LABELS[tender.status]}
              tone={
                tender.status === "published"
                  ? "success"
                  : tender.status === "closed"
                    ? "warning"
                    : tender.status === "cancelled"
                      ? "destructive"
                      : "secondary"
              }
            />
            <VisibilityBadge visibility={tender.visibility} />
            <DemoBadge isDemo={tender.isDemo} />
          </div>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>Evidence source:</span>
            <SourceChip source={source} />
            {source ? <span>{source.title}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailGrid>
            <DetailItem label="Buyer">
              {buyer ? (
                <Link href={`/organizations/${buyer.id}`} className="text-spectral-600 hover:underline">
                  {buyer.name}
                </Link>
              ) : (
                tender.buyerOrganizationId
              )}
            </DetailItem>
            <DetailItem label="Site">
              {site ? (
                <Link href={`/sites/${site.id}`} className="text-spectral-600 hover:underline">
                  {site.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Country">
              {tender.country} — {countryName(tender.country)}
            </DetailItem>
            <DetailItem label="Contract period">
              {tender.contractPeriodMonths ? `${tender.contractPeriodMonths} months` : "—"}
            </DetailItem>
            <DetailItem label="Published">{formatDate(tender.publicationDate)}</DetailItem>
            <DetailItem label="Submission deadline">
              {formatDate(tender.submissionDeadline)}{" "}
              {tender.status === "published" && tender.submissionDeadline ? (
                <DeadlineCountdown deadline={tender.submissionDeadline} />
              ) : null}
            </DetailItem>
            <DetailItem label="Awarded">{formatDate(tender.awardDate)}</DetailItem>
            <DetailItem label="Contract end (estimated)">
              {contractEnd ?? "—"}{" "}
              {renewalWindow ? <StatusBadge label={`Renews in ${daysToContractEnd} d`} tone="warning" /> : null}
            </DetailItem>
          </DetailGrid>
          {renewalWindow ? (
            <p className="rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-fg">
              The awarded contract ends within the 120-day renewal window — a renewal signal is active.{" "}
              <Link href="/signals" className="font-medium underline">
                Review it in Signals
              </Link>
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={<>Lots &amp; items ({lots.length})</>}
          description="Tender structure with product/SKU mappings."
        >
          <div className="space-y-4">
            {lots.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No lots yet"
                description="Add the first lot below, then capture its items."
              />
            ) : (
              lots.map((lot) => {
                const lotItems = items.filter((item) => item.lotId === lot.id);
                return (
                  <section key={lot.id} aria-label={lot.name} className="rounded-md border border-slate-200">
                    <header className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{lot.name}</p>
                      {lot.description ? <p className="text-xs text-slate-500">{lot.description}</p> : null}
                    </header>
                    {lotItems.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">No items captured in this lot yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Required spec</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead>Mapped product / SKU</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lotItems.map((item) => {
                            const product = item.mappedProductId ? productById.get(item.mappedProductId) : undefined;
                            const sku = item.mappedSkuId ? skuById.get(item.mappedSkuId) : undefined;
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="max-w-56 text-xs">{item.description}</TableCell>
                                <TableCell className="max-w-48 text-xs text-slate-600">
                                  {item.requiredSpecification ?? "—"}
                                </TableCell>
                                <TableCell className="text-right text-xs tabular-nums">
                                  {item.quantity !== undefined ? `${item.quantity} ${item.unit ?? ""}`.trim() : "—"}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {product || sku ? (
                                    <span className="flex flex-col gap-0.5">
                                      {product ? (
                                        <Link href={`/products/${product.id}`} className="text-spectral-600 hover:underline">
                                          {product.name}
                                        </Link>
                                      ) : null}
                                      {sku ? (
                                        <Link href={`/skus/${sku.id}`} className="text-spectral-600 hover:underline">
                                          {sku.name}
                                        </Link>
                                      ) : null}
                                    </span>
                                  ) : (
                                    <Badge variant="warning">Unmapped</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </section>
                );
              })
            )}
            <Separator />
            <div className="space-y-4">
              <section aria-label="Add lot">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add lot</p>
                <AddLotForm action={addTenderLot.bind(null, tender.id)} />
              </section>
              {lots.length > 0 ? (
                <section aria-label="Add item">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Add item (optional SKU mapping)
                  </p>
                  <AddItemForm action={addTenderItem.bind(null, tender.id)} lots={lotOptions} skus={skuOptions} />
                </section>
              ) : (
                <p className="text-xs text-slate-500">Add a lot before capturing items.</p>
              )}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Bidders ({bidders.length})
              </span>
            }
          >
            <div className="space-y-4">
              {bidders.length === 0 ? (
                <p className="text-xs text-slate-500">No bidders recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead className="text-right">Bid amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bidders.map((bidder) => {
                      const org = orgById.get(bidder.organizationId);
                      return (
                        <TableRow key={bidder.id}>
                          <TableCell className="text-xs text-slate-600">
                            {bidder.lotId ? (lotById.get(bidder.lotId)?.name ?? bidder.lotId) : "Whole tender"}
                          </TableCell>
                          <TableCell>
                            {org ? (
                              <Link href={`/organizations/${org.id}`} className="text-spectral-600 hover:underline">
                                {org.name}
                              </Link>
                            ) : (
                              bidder.organizationId
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(bidder.bidAmount, bidder.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Separator />
              <section aria-label="Record bidder">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Record bidder</p>
                <AddBidderForm
                  action={addTenderBidder.bind(null, tender.id)}
                  lots={lotOptions}
                  organizations={organizationOptions}
                />
              </section>
            </div>
          </SectionCard>

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Awards ({awards.length})
              </span>
            }
            description="Award amounts are shown exactly as stated in the award notice — no currency conversion or normalization is applied."
          >
            <div className="space-y-4">
              {awards.length === 0 ? (
                <p className="text-xs text-slate-500">No award recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Manufacturer / product</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awards.map((award) => {
                      const supplier = orgById.get(award.awardedSupplierOrgId);
                      const manufacturer = award.awardedManufacturerOrgId
                        ? orgById.get(award.awardedManufacturerOrgId)
                        : undefined;
                      const product = award.awardedProductId ? productById.get(award.awardedProductId) : undefined;
                      return (
                        <TableRow key={award.id}>
                          <TableCell className="max-w-40 text-xs text-slate-600">
                            {award.lotId
                              ? (lotById.get(award.lotId)?.name ?? award.lotId)
                              : award.tenderItemId
                                ? (itemById.get(award.tenderItemId)?.description ?? award.tenderItemId)
                                : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {supplier ? (
                              <Link href={`/organizations/${supplier.id}`} className="text-spectral-600 hover:underline">
                                {supplier.name}
                              </Link>
                            ) : (
                              award.awardedSupplierOrgId
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {manufacturer ? (
                              <Link href={`/organizations/${manufacturer.id}`} className="text-spectral-600 hover:underline">
                                {manufacturer.name}
                              </Link>
                            ) : (
                              "—"
                            )}
                            {product ? (
                              <>
                                {" / "}
                                <Link href={`/products/${product.id}`} className="text-spectral-600 hover:underline">
                                  {product.name}
                                </Link>
                              </>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(award.amount, award.currency)}
                            <div className="text-[11px] text-slate-400">{formatDate(award.awardDate)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              <EvidenceStateBadge state={award.evidence.state} />
                              <span className="text-[11px] text-slate-500">
                                {formatConfidence(award.evidence.confidence)}
                              </span>
                            </div>
                            {award.evidence.notes ? (
                              <p className="mt-0.5 max-w-48 text-[11px] text-slate-500">{award.evidence.notes}</p>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Separator />
              {lots.length > 0 || items.length > 0 ? (
                <section aria-label="Record award">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Record award</p>
                  <RecordAwardForm
                    action={recordTenderAward.bind(null, tender.id)}
                    lots={lotOptions}
                    items={itemOptions}
                    organizations={organizationOptions}
                    products={productOptions}
                    evidenceSourceId={tender.sourceId}
                  />
                </section>
              ) : (
                <p className="text-xs text-slate-500">Add a lot or item before recording an award.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Documents" description="Files attached to the tender's evidence source.">
            {sourceDocuments.items.length === 0 ? (
              <p className="text-xs text-slate-500">No documents attached to the source record.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sourceDocuments.items.map((document) => (
                  <li key={document.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{document.fileName}</p>
                      <p className="font-mono text-[11px] text-slate-400">{document.storagePath}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <p>{document.mimeType}</p>
                      {document.pageCount ? <p>{document.pageCount} pages</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>

        <SectionCard title="Events timeline" description="Newest first.">
            {sortedEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No tender events recorded.</p>
            ) : (
              <Timeline
                entries={sortedEvents.map((event) => ({
                  id: event.id,
                  at: event.at,
                  title: TENDER_EVENT_TYPE_LABELS[event.type],
                  description: event.description,
                }))}
              />
            )}
        </SectionCard>
      </div>

      <SectionCard title="Related signals" description="Derived opportunities referencing this tender.">
          <SignalList signals={relatedSignals} />
      </SectionCard>

      <p className="text-[11px] text-slate-400">
        Record created {formatDateTime(tender.createdAt)} · last updated {formatDateTime(tender.updatedAt)}
      </p>
    </div>
  );
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  if (days < 0) return <StatusBadge label={`${-days} d overdue`} tone="destructive" />;
  if (days <= 14) return <StatusBadge label={`${days} d left`} tone="warning" />;
  return <span className="text-xs text-slate-500">({days} d left)</span>;
}
