import {
  ConfidenceValue,
  DateText,
  humanize,
} from "@/components/products/format";
import {
  DemoBadge,
  RelevanceBadge,
  SignalStatusBadge,
  SignalTypeBadge,
} from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { EntityRefLink } from "@/components/products/entity-link";
import { FilterBar } from "@/components/products/filter-bar";
import { PageHeader } from "@/components/products/page-header";
import { one, type SearchParams } from "@/components/products/search-params";
import { SignalCardActions } from "@/components/intelligence/signal-card-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import {
  SIGNAL_COMMERCIAL_RELEVANCES,
  SIGNAL_STATUSES,
  SIGNAL_TYPES,
  type EntityRef,
  type OpportunitySignal,
} from "@/lib/domain/types";
import { demoTenantId } from "@/lib/env";
import type { BuildMemoireHandoffInput } from "@/lib/integrations/memoire";

import { acknowledgeSignalAction, dismissSignalAction } from "./actions";

export const metadata = { title: "Signals" };

export default async function SignalsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const typeFilter = one(sp.type);
  const statusFilter = one(sp.status);
  const relevanceFilter = one(sp.relevance);

  const repo = await getRepository();
  const filters: Record<string, string> = {};
  if (typeFilter) filters.type = typeFilter;
  if (statusFilter) filters.status = statusFilter;
  if (relevanceFilter) filters.commercialRelevance = relevanceFilter;

  const [signals, organizations, products, skus, tenders, assets, assetModels] = await Promise.all([
    repo.listSignals({
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pageSize: 100,
    }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("product", { pageSize: 500 }),
    repo.list("sku", { pageSize: 500 }),
    repo.list("tender", { pageSize: 100 }),
    repo.list("installed_asset", { pageSize: 200 }),
    repo.list("asset_model", { pageSize: 100 }),
  ]);

  // Display names for the entity types that appear in signal references.
  const modelById = new Map(assetModels.items.map((model) => [model.id, model]));
  const nameByRef = new Map<string, string>();
  for (const org of organizations.items) nameByRef.set(`organization:${org.id}`, org.name);
  for (const product of products.items) nameByRef.set(`product:${product.id}`, product.name);
  for (const sku of skus.items) nameByRef.set(`sku:${sku.id}`, sku.name);
  for (const tender of tenders.items) nameByRef.set(`tender:${tender.id}`, `${tender.code} — ${tender.title}`);
  for (const asset of assets.items) {
    const model = modelById.get(asset.assetModelId);
    nameByRef.set(`installed_asset:${asset.id}`, model?.model ?? asset.id);
  }

  const handoffFor = (signal: OpportunitySignal): BuildMemoireHandoffInput => ({
    tenantId: demoTenantId,
    entityUrl: `/signals`,
    entity: {
      nexusEntityId: signal.id,
      entityType: "market_signal",
      displayName: humanize(signal.type),
      summary: signal.reason,
      keyFacts: {
        type: signal.type,
        commercialRelevance: signal.commercialRelevance,
        confidence: signal.confidence.toFixed(2),
        status: signal.status,
        generatedAt: signal.generatedAt,
        ...(signal.expiresAt ? { expiresAt: signal.expiresAt } : {}),
        recommendedAction: signal.recommendedAction,
        triggeringRecords: signal.triggeringRecordIds.join(", "),
        relatedEntities: signal.relatedEntities
          .map((ref) => `${ref.entityType}:${ref.entityId}`)
          .join(", "),
      },
      evidenceRefs: [],
    },
    suggestedAction: {
      kind: "review_signal",
      label: "Review this Nexus signal in Memoire",
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Opportunity signals"
        description="Derived commercial signals, regenerated from the current dataset on every load. Each signal explains itself: reason, triggering records and a recommended action."
      />

      <FilterBar
        basePath="/signals"
        selects={[
          {
            name: "type",
            label: "Type",
            value: typeFilter,
            options: SIGNAL_TYPES.map((type) => ({ value: type, label: humanize(type) })),
          },
          {
            name: "status",
            label: "Status",
            value: statusFilter,
            options: SIGNAL_STATUSES.map((status) => ({ value: status, label: humanize(status) })),
          },
          {
            name: "relevance",
            label: "Commercial relevance",
            value: relevanceFilter,
            options: SIGNAL_COMMERCIAL_RELEVANCES.map((relevance) => ({
              value: relevance,
              label: humanize(relevance),
            })),
          },
        ]}
      />

      {signals.items.length === 0 ? (
        <EmptyState
          title="No signals match the filters"
          description="Signals are recomputed from the dataset — try resetting the status or type filters."
        />
      ) : (
        <div className="space-y-3">
          {signals.items.map((signal) => (
            <Card key={signal.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SignalTypeBadge type={signal.type} />
                      <RelevanceBadge relevance={signal.commercialRelevance} />
                      <SignalStatusBadge status={signal.status} />
                      <ConfidenceValue value={signal.confidence} />
                      <DemoBadge />
                    </div>
                    <p className="text-sm text-slate-800">{signal.reason}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Generated <DateText date={signal.generatedAt} />
                      </span>
                      {signal.expiresAt ? (
                        <span>
                          Expires <DateText date={signal.expiresAt} />
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Recommended action:</span>{" "}
                      {signal.recommendedAction}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        Related:
                      </span>
                      {signal.relatedEntities.map((ref: EntityRef) => (
                        <EntityRefLink
                          key={`${ref.entityType}:${ref.entityId}`}
                          entityRef={ref}
                          label={nameByRef.get(`${ref.entityType}:${ref.entityId}`) ?? null}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-accent hover:underline"
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        Triggering records:
                      </span>
                      {signal.triggeringRecordIds.map((recordId) => (
                        <Badge
                          key={recordId}
                          variant="outline"
                          className="font-mono text-[10px] font-normal text-slate-500"
                          title={recordId}
                        >
                          {recordId.length > 28 ? `${recordId.slice(0, 28)}…` : recordId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <SignalCardActions
                    signalId={signal.id}
                    status={signal.status}
                    handoffInput={handoffFor(signal)}
                    acknowledge={acknowledgeSignalAction}
                    dismiss={dismissSignalAction}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {signals.total} signal{signals.total === 1 ? "" : "s"} computed from the current dataset.
        Acknowledge/dismiss state is held in the demo workspace memory only.
      </p>
    </div>
  );
}
