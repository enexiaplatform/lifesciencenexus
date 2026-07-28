import Link from "next/link";
import { Warehouse } from "lucide-react";

import { DemoBadge, FreshnessBadge, StatusBadge } from "@/components/market/badges";
import { EmptyState } from "@/components/market/empty-state";
import { FilterBar, FilterSelect } from "@/components/market/filter-bar";
import { AVAILABILITY_STATUS_LABELS, countryName, formatDate } from "@/components/market/labels";
import { PageHeader } from "@/components/market/page-header";
import { Pagination } from "@/components/market/pagination";
import { firstParam, flattenParams, pageParam, type SearchParams } from "@/components/market/search-params";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { AVAILABILITY_STATUSES, type AvailabilityStatus } from "@/lib/domain/types";

export const metadata = { title: "Availability" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

const statusTones: Record<AvailabilityStatus, "success" | "warning" | "destructive" | "secondary"> = {
  in_stock: "success",
  limited: "warning",
  out_of_stock: "destructive",
  unknown: "secondary",
};

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const statusFilter = firstParam(params.status);
  const countryFilter = firstParam(params.country);
  const page = pageParam(params.page);

  const repo = await getRepository();

  const filters: Record<string, string> = {};
  if (statusFilter && (AVAILABILITY_STATUSES as readonly string[]).includes(statusFilter)) {
    filters.status = statusFilter;
  }
  if (countryFilter) filters.country = countryFilter;

  const [result, skus, orgs] = await Promise.all([
    repo.list("availability_observation", {
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort: { field: "observedAt", direction: "desc" },
      page,
      pageSize: PAGE_SIZE,
    }),
    repo.list("sku", { pageSize: 500 }),
    repo.list("organization", { pageSize: 500 }),
  ]);

  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));
  const orgById = new Map(orgs.items.map((org) => [org.id, org]));

  // Country options come from all observations, not just the current page.
  const allObservations = await repo.list("availability_observation", { pageSize: 500 });
  const uniqueCountries = [...new Set(allObservations.items.map((observation) => observation.country))].sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="Point-in-time stock observations at suppliers. Observations are immutable; freshness badges show how current each reading is."
      />

      <FilterBar>
        <FilterSelect
          name="status"
          label="Status"
          value={statusFilter}
          options={AVAILABILITY_STATUSES.map((status) => ({
            value: status,
            label: AVAILABILITY_STATUS_LABELS[status],
          }))}
          allLabel="All statuses"
        />
        <FilterSelect
          name="country"
          label="Country"
          value={countryFilter}
          options={uniqueCountries.map((code) => ({ value: code, label: `${code} — ${countryName(code)}` }))}
          allLabel="All countries"
        />
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="No availability observations match"
          description="Stock observations are captured from supplier quotations and field checks. Adjust the filters to widen the view."
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lead time</TableHead>
                <TableHead>Observed</TableHead>
                <TableHead>Freshness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((observation) => {
                const sku = skuById.get(observation.skuId);
                const supplier = orgById.get(observation.supplierOrgId);
                return (
                  <TableRow key={observation.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sku ? (
                          <Link href={`/skus/${sku.id}`} className="font-medium text-accent hover:underline">
                            {sku.name}
                          </Link>
                        ) : (
                          <span className="text-slate-500">{observation.skuId}</span>
                        )}
                        {sku?.catalogueNumber ? (
                          <span className="font-mono text-xs text-slate-500">({sku.catalogueNumber})</span>
                        ) : null}
                        <DemoBadge isDemo={observation.isDemo} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier ? (
                        <Link href={`/organizations/${supplier.id}`} className="text-accent hover:underline">
                          {supplier.name}
                        </Link>
                      ) : (
                        observation.supplierOrgId
                      )}
                    </TableCell>
                    <TableCell>{observation.country}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={AVAILABILITY_STATUS_LABELS[observation.status]}
                        tone={statusTones[observation.status]}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {observation.leadTimeDays !== undefined ? `${observation.leadTimeDays} d` : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      <time dateTime={observation.observedAt}>{formatDate(observation.observedAt)}</time>
                    </TableCell>
                    <TableCell>
                      <FreshnessBadge date={observation.observedAt} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        searchParams={flattenParams(params)}
      />
    </div>
  );
}
