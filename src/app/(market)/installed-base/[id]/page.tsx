import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, Wrench } from "lucide-react";

import { DemoBadge, EvidenceStateBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { Breadcrumb } from "@/components/market/breadcrumb";
import { DetailGrid, DetailItem } from "@/components/market/description-list";
import { EmptyState } from "@/components/market/empty-state";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
  QUALIFICATION_STATUS_LABELS,
  formatConfidence,
  formatDate,
  humanize,
} from "@/components/market/labels";
import { SignalList } from "@/components/market/signal-list";
import { SourceChip } from "@/components/market/source-chip";
import { TenantPrivateNotice } from "@/components/market/tenant-private-notice";
import { Timeline } from "@/components/market/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { daysUntil } from "@/lib/domain/freshness";

import { recordMaintenanceEvent, updateQualificationStatus } from "./actions";
import { RecordMaintenanceForm, UpdateQualificationForm } from "./asset-forms";

export const dynamic = "force-dynamic";

const REPLACEMENT_DUE_WINDOW_DAYS = 180;

export default async function InstalledAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();

  const detail = await repo.getAssetDetail(id);
  if (!detail) notFound();
  const { asset, model, site, laboratory, lifecycleEvents, maintenanceEvents, qualificationEvents, compatibleConsumables } =
    detail;

  const [manufacturer, brand, serviceProvider, siteOrg, sources, consumptionModels, replacementAssumptions, orgs, signals] =
    await Promise.all([
      model ? repo.getById("organization", model.manufacturerOrgId) : Promise.resolve(null),
      model?.brandId ? repo.getById("brand", model.brandId) : Promise.resolve(null),
      asset.serviceProviderOrgId ? repo.getById("organization", asset.serviceProviderOrgId) : Promise.resolve(null),
      site ? repo.getById("organization", site.organizationId) : Promise.resolve(null),
      repo.list("source", { pageSize: 500 }),
      repo.list("consumption_model", { pageSize: 100 }),
      repo.list("replacement_assumption", { pageSize: 100 }),
      repo.list("organization", { pageSize: 500 }),
      repo.listSignals({ pageSize: 100 }),
    ]);

  const sourceById = new Map(sources.items.map((source) => [source.id, source]));
  const skuById = new Map(compatibleConsumables.map((compatibility) => [compatibility.skuId, compatibility.sku]));

  const assetConsumption = consumptionModels.items.filter(
    (consumption) => consumption.installedAssetId === id || consumption.assetModelId === asset.assetModelId,
  );
  const categoryAssumptions = model
    ? replacementAssumptions.items.filter((assumption) => assumption.assetCategory === model.category)
    : [];

  const relatedSignals = signals.items.filter((signal) =>
    signal.relatedEntities.some(
      (entity) =>
        (entity.entityType === "installed_asset" && entity.entityId === id) ||
        (entity.entityType === "asset_model" && entity.entityId === asset.assetModelId),
    ),
  );

  const daysToReplacement = asset.expectedReplacementDate ? daysUntil(asset.expectedReplacementDate) : null;

  const providerOptions = orgs.items
    .map((org) => ({ value: org.id, label: org.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const sortedLifecycle = [...lifecycleEvents].sort((a, b) => b.at.localeCompare(a.at));
  const sortedMaintenance = [...maintenanceEvents].sort((a, b) => b.at.localeCompare(a.at));
  const sortedQualification = [...qualificationEvents].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Installed base", href: "/installed-base" }, { label: model?.model ?? asset.id }]}
      />

      <TenantPrivateNotice message="This installed-base record is tenant-private field intelligence — serial number, qualification and consumption data are visible only inside this workspace." />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Boxes className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <CardTitle className="text-xl">{model?.model ?? asset.assetModelId}</CardTitle>
            {model ? <Badge variant="secondary">{ASSET_CATEGORY_LABELS[model.category]}</Badge> : null}
            <StatusBadge
              label={ASSET_STATUS_LABELS[asset.status]}
              tone={
                asset.status === "operational"
                  ? "success"
                  : asset.status === "under_maintenance"
                    ? "warning"
                    : asset.status === "retired"
                      ? "secondary"
                      : "outline"
              }
            />
            <StatusBadge
              label={QUALIFICATION_STATUS_LABELS[asset.qualificationStatus]}
              tone={
                asset.qualificationStatus === "iq_oq_pq_complete"
                  ? "success"
                  : asset.qualificationStatus === "partial"
                    ? "warning"
                    : "secondary"
              }
            />
            <VisibilityBadge visibility={asset.visibility} />
            <DemoBadge isDemo={asset.isDemo} />
          </div>
          <CardDescription>
            {siteOrg ? (
              <Link href={`/organizations/${siteOrg.id}`} className="text-accent hover:underline">
                {siteOrg.name}
              </Link>
            ) : null}
            {siteOrg && site ? " · " : ""}
            {site ? (
              <Link href={`/sites/${site.id}`} className="text-accent hover:underline">
                {site.name}
              </Link>
            ) : (
              "Unknown site"
            )}
            {laboratory ? (
              <>
                {" · "}
                <Link href={`/laboratories/${laboratory.id}`} className="text-accent hover:underline">
                  {laboratory.name}
                </Link>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailGrid>
            <DetailItem label="Manufacturer">
              {manufacturer ? (
                <Link href={`/organizations/${manufacturer.id}`} className="text-accent hover:underline">
                  {manufacturer.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Brand">{brand?.name ?? "—"}</DetailItem>
            <DetailItem label="Serial number">
              {asset.serialNumber ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs">{asset.serialNumber}</span>
                  <VisibilityBadge visibility="tenant_private" />
                </span>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Record confidence">{formatConfidence(asset.confidence)}</DetailItem>
            <DetailItem label="Installed">{formatDate(asset.installationDate)}</DetailItem>
            <DetailItem label="Expected replacement">
              {formatDate(asset.expectedReplacementDate)}{" "}
              {daysToReplacement !== null && daysToReplacement < 0 ? (
                <StatusBadge label={`${-daysToReplacement} d overdue`} tone="destructive" />
              ) : daysToReplacement !== null && daysToReplacement <= REPLACEMENT_DUE_WINDOW_DAYS ? (
                <StatusBadge label={`in ${daysToReplacement} d`} tone="warning" />
              ) : null}
            </DetailItem>
            <DetailItem label="Est. annual consumption">
              {asset.estimatedAnnualConsumption !== undefined
                ? `${asset.estimatedAnnualConsumption} units/year`
                : "—"}
            </DetailItem>
            <DetailItem label="Service provider">
              {serviceProvider ? (
                <Link href={`/organizations/${serviceProvider.id}`} className="text-accent hover:underline">
                  {serviceProvider.name}
                </Link>
              ) : (
                "—"
              )}
            </DetailItem>
          </DetailGrid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compatible consumables ({compatibleConsumables.length})</CardTitle>
          <CardDescription>
            SKUs evidenced as compatible with this asset model — the pull-through opportunity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compatibleConsumables.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No consumables mapped for this asset model"
              description="This is a coverage gap: it feeds the asset_without_consumables signal. Map compatible SKUs from the product graph to close it."
              action={{ label: "Open related signals", href: "/signals" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Catalogue no.</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compatibleConsumables.map((compatibility) => {
                  const sku = skuById.get(compatibility.skuId);
                  return (
                    <TableRow key={compatibility.id}>
                      <TableCell>
                        {sku ? (
                          <Link href={`/skus/${sku.id}`} className="font-medium text-accent hover:underline">
                            {sku.name}
                          </Link>
                        ) : (
                          compatibility.skuId
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {sku?.catalogueNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <SourceChip
                          source={
                            compatibility.evidence.sourceId ? sourceById.get(compatibility.evidence.sourceId) : null
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <EvidenceStateBadge state={compatibility.evidence.state} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatConfidence(compatibility.evidence.confidence)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consumption model</CardTitle>
            <CardDescription>Estimated recurring consumable usage for this asset or its model.</CardDescription>
          </CardHeader>
          <CardContent>
            {assetConsumption.length === 0 ? (
              <p className="text-xs text-slate-500">
                No consumption model recorded — annual pull-through cannot be forecast for this asset.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Est. annual qty</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetConsumption.map((consumption) => {
                    const sku = skuById.get(consumption.skuId);
                    return (
                      <TableRow key={consumption.id}>
                        <TableCell className="text-xs">
                          {sku ? (
                            <Link href={`/skus/${sku.id}`} className="text-accent hover:underline">
                              {sku.name}
                            </Link>
                          ) : (
                            consumption.skuId
                          )}
                          <span className="ml-1 text-slate-400">
                            {consumption.installedAssetId === id ? "(asset)" : "(model)"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{consumption.estimatedAnnualQuantity}</TableCell>
                        <TableCell className="max-w-48 text-xs text-slate-600">{consumption.basis ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatConfidence(consumption.confidence)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Replacement assumptions</CardTitle>
            <CardDescription>
              Rules of thumb behind replacement forecasts for this category (tenant-private).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryAssumptions.length === 0 ? (
              <p className="text-xs text-slate-500">No replacement assumption recorded for this asset category.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {categoryAssumptions.map((assumption) => (
                  <li key={assumption.id} className="py-2 text-sm">
                    <p className="font-medium text-slate-800">
                      {ASSET_CATEGORY_LABELS[assumption.assetCategory]}: typical lifetime{" "}
                      {assumption.typicalLifetimeYears} years
                      {assumption.geographyCode ? ` (${assumption.geographyCode})` : ""}
                    </p>
                    {assumption.basis ? <p className="text-xs text-slate-500">{assumption.basis}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifecycle events</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedLifecycle.length === 0 ? (
              <p className="text-xs text-slate-500">No lifecycle events recorded.</p>
            ) : (
              <Timeline
                entries={sortedLifecycle.map((event) => ({
                  id: event.id,
                  at: event.at,
                  title: humanize(event.type),
                  description: event.description,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Maintenance events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedMaintenance.length === 0 ? (
              <p className="text-xs text-slate-500">No maintenance events recorded.</p>
            ) : (
              <Timeline
                entries={sortedMaintenance.map((event) => ({
                  id: event.id,
                  at: event.at,
                  title: humanize(event.type),
                  description: [event.description, event.nextDueDate ? `Next due ${formatDate(event.nextDueDate)}` : null]
                    .filter(Boolean)
                    .join(" · "),
                }))}
              />
            )}
            <section aria-label="Record maintenance event" className="border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Record maintenance event
              </p>
              <RecordMaintenanceForm action={recordMaintenanceEvent.bind(null, asset.id)} providers={providerOptions} />
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qualification events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedQualification.length === 0 ? (
              <p className="text-xs text-slate-500">No qualification events recorded.</p>
            ) : (
              <Timeline
                entries={sortedQualification.map((event) => ({
                  id: event.id,
                  at: event.at,
                  title: event.kind,
                  trailing: (
                    <StatusBadge
                      label={event.passed === undefined ? "No result" : event.passed ? "Passed" : "Failed"}
                      tone={event.passed === undefined ? "secondary" : event.passed ? "success" : "destructive"}
                    />
                  ),
                }))}
              />
            )}
            <section aria-label="Update qualification status" className="border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Update qualification status
              </p>
              <UpdateQualificationForm
                action={updateQualificationStatus.bind(null, asset.id)}
                current={asset.qualificationStatus}
              />
            </section>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related signals</CardTitle>
          <CardDescription>Derived opportunities referencing this asset or its model.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignalList signals={relatedSignals} />
        </CardContent>
      </Card>
    </div>
  );
}
