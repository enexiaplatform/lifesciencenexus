import Link from "next/link";
import { Boxes } from "lucide-react";

import { DemoBadge, StatusBadge, VisibilityBadge } from "@/components/market/badges";
import { EmptyState } from "@/components/market/empty-state";
import { FilterBar, FilterSelect } from "@/components/market/filter-bar";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
  QUALIFICATION_STATUS_LABELS,
  formatDate,
} from "@/components/market/labels";
import { PageHeader } from "@/components/market/page-header";
import { Pagination } from "@/components/market/pagination";
import { firstParam, flattenParams, pageParam, type SearchParams } from "@/components/market/search-params";
import { TenantPrivateNotice } from "@/components/market/tenant-private-notice";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { daysUntil } from "@/lib/domain/freshness";
import { ASSET_CATEGORIES, INSTALLED_ASSET_STATUSES, type InstalledAssetStatus } from "@/lib/domain/types";

export const metadata = { title: "Installed Base" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;
/** Matches the signal engine's equipment_replacement_due window. */
const REPLACEMENT_DUE_WINDOW_DAYS = 180;

export default async function InstalledBasePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const categoryFilter = firstParam(params.category);
  const statusFilter = firstParam(params.status);
  const page = pageParam(params.page);

  const repo = await getRepository();

  const [assets, models, orgs, sites, labs, compatibilities] = await Promise.all([
    repo.list("installed_asset", {
      filters:
        statusFilter && (INSTALLED_ASSET_STATUSES as readonly string[]).includes(statusFilter)
          ? { status: statusFilter as InstalledAssetStatus }
          : undefined,
      sort: { field: "expectedReplacementDate", direction: "asc" },
      pageSize: 500,
    }),
    repo.list("asset_model", { pageSize: 500 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("site", { pageSize: 500 }),
    repo.list("laboratory", { pageSize: 500 }),
    repo.list("consumable_compatibility", { pageSize: 500 }),
  ]);

  const modelById = new Map(models.items.map((model) => [model.id, model]));
  const orgById = new Map(orgs.items.map((org) => [org.id, org]));
  const siteById = new Map(sites.items.map((site) => [site.id, site]));
  const labById = new Map(labs.items.map((lab) => [lab.id, lab]));
  const compatibilityCountByModel = new Map<string, number>();
  for (const compatibility of compatibilities.items) {
    compatibilityCountByModel.set(
      compatibility.assetModelId,
      (compatibilityCountByModel.get(compatibility.assetModelId) ?? 0) + 1,
    );
  }

  const rows = assets.items.filter((asset) => {
    if (!categoryFilter || !(ASSET_CATEGORIES as readonly string[]).includes(categoryFilter)) return true;
    return modelById.get(asset.assetModelId)?.category === categoryFilter;
  });

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Installed Base"
        description="Instruments observed at customer sites (tenant-private field intelligence). Replacement dates within 180 days and missing consumable mappings are highlighted as gaps."
      />

      <TenantPrivateNotice message="The installed base is tenant-private: serial numbers, qualification status and replacement forecasts never leave this workspace." />

      <FilterBar>
        <FilterSelect
          name="category"
          label="Category"
          value={categoryFilter}
          options={ASSET_CATEGORIES.map((category) => ({ value: category, label: ASSET_CATEGORY_LABELS[category] }))}
          allLabel="All categories"
        />
        <FilterSelect
          name="status"
          label="Status"
          value={statusFilter}
          options={INSTALLED_ASSET_STATUSES.map((status) => ({ value: status, label: ASSET_STATUS_LABELS[status] }))}
          allLabel="All statuses"
        />
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No installed assets match these filters"
          description="Installed-base records are captured during field observations at customer sites."
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table compact>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Site / laboratory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Installed</TableHead>
                <TableHead>Expected replacement</TableHead>
                <TableHead>Consumables mapped</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((asset) => {
                const model = modelById.get(asset.assetModelId);
                const manufacturer = model ? orgById.get(model.manufacturerOrgId) : undefined;
                const site = siteById.get(asset.siteId);
                const lab = asset.laboratoryId ? labById.get(asset.laboratoryId) : undefined;
                const consumableCount = compatibilityCountByModel.get(asset.assetModelId) ?? 0;
                const daysToReplacement = asset.expectedReplacementDate
                  ? daysUntil(asset.expectedReplacementDate)
                  : null;
                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/installed-base/${asset.id}`} className="font-medium text-spectral-600 hover:underline">
                          {model?.model ?? asset.assetModelId}
                        </Link>
                        <DemoBadge isDemo={asset.isDemo} />
                        <VisibilityBadge visibility={asset.visibility} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {manufacturer ? (
                        <Link href={`/organizations/${manufacturer.id}`} className="text-spectral-600 hover:underline">
                          {manufacturer.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {model ? <Badge variant="secondary">{ASSET_CATEGORY_LABELS[model.category]}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {site ? (
                        <Link href={`/sites/${site.id}`} className="text-spectral-600 hover:underline">
                          {site.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {lab ? (
                        <>
                          {" / "}
                          <Link href={`/laboratories/${lab.id}`} className="text-spectral-600 hover:underline">
                            {lab.name}
                          </Link>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="tabular-nums text-xs text-slate-600">{formatDate(asset.installationDate)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-xs">
                      {formatDate(asset.expectedReplacementDate)}{" "}
                      {daysToReplacement !== null && daysToReplacement < 0 ? (
                        <StatusBadge label={`${-daysToReplacement} d overdue`} tone="destructive" />
                      ) : daysToReplacement !== null && daysToReplacement <= REPLACEMENT_DUE_WINDOW_DAYS ? (
                        <StatusBadge label={`in ${daysToReplacement} d`} tone="warning" />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {consumableCount > 0 ? (
                        <Badge variant="success">Yes ({consumableCount})</Badge>
                      ) : (
                        <Badge variant="warning">No — gap</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        searchParams={flattenParams(params)}
      />
    </div>
  );
}
