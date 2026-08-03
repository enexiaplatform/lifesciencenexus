import Link from "next/link";
import { Building2 } from "lucide-react";

import { DemoBadge, VisibilityBadge } from "@/components/market/badges";
import { EmptyState } from "@/components/market/empty-state";
import { FilterBar, FilterQuery, FilterSelect } from "@/components/market/filter-bar";
import { ORGANIZATION_TYPE_LABELS, countryName, formatDateTime } from "@/components/market/labels";
import { PageHeader } from "@/components/market/page-header";
import { Pagination } from "@/components/market/pagination";
import { firstParam, flattenParams, pageParam, type SearchParams } from "@/components/market/search-params";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { ORGANIZATION_TYPES, type OrganizationType } from "@/lib/domain/types";

import { CreateOrganizationDialog } from "./create-organization-dialog";

export const metadata = { title: "Organizations" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = firstParam(params.query);
  const typeFilter = firstParam(params.type);
  const countryFilter = firstParam(params.country);
  const page = pageParam(params.page);

  const repo = await getRepository();

  const filters: Record<string, string> = {};
  if (typeFilter && (ORGANIZATION_TYPES as readonly string[]).includes(typeFilter)) {
    // `types` is an array field; the repository matches on overlap.
    filters.types = typeFilter;
  }
  if (countryFilter) filters.country = countryFilter;

  const [result, sitesResult, allOrgs] = await Promise.all([
    repo.list("organization", {
      query: query || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort: { field: "updatedAt", direction: "desc" },
      page,
      pageSize: PAGE_SIZE,
    }),
    repo.list("site", { pageSize: 500 }),
    repo.list("organization", { pageSize: 500 }),
  ]);

  const siteCountByOrg = new Map<string, number>();
  for (const site of sitesResult.items) {
    siteCountByOrg.set(site.organizationId, (siteCountByOrg.get(site.organizationId) ?? 0) + 1);
  }

  const countryOptions = [...new Set(allOrgs.items.map((org) => org.country))]
    .sort()
    .map((code) => ({ value: code, label: `${code} — ${countryName(code)}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manufacturers, distributors, customers and public bodies in the market graph. Every row shows its visibility and demo provenance."
        actions={<CreateOrganizationDialog />}
      />

      <FilterBar>
        <FilterQuery value={query} placeholder="Name, alias or identifier…" />
        <FilterSelect
          name="type"
          label="Type"
          value={typeFilter}
          options={ORGANIZATION_TYPES.map((type) => ({ value: type, label: ORGANIZATION_TYPE_LABELS[type] }))}
          allLabel="All types"
        />
        <FilterSelect name="country" label="Country" value={countryFilter} options={countryOptions} allLabel="All countries" />
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations match these filters"
          description="Try widening the search, or create the organization you are mapping."
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Types</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Sites</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="font-medium text-spectral-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600"
                      >
                        {org.name}
                      </Link>
                      <DemoBadge isDemo={org.isDemo} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-64 flex-wrap gap-1">
                      {org.types.map((type: OrganizationType) => (
                        <Badge key={type} variant="secondary">
                          {ORGANIZATION_TYPE_LABELS[type]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{org.country}</span>{" "}
                    <span className="text-xs text-slate-500">{countryName(org.country)}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{siteCountByOrg.get(org.id) ?? 0}</TableCell>
                  <TableCell>
                    <VisibilityBadge visibility={org.visibility} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-xs text-slate-500">
                    <time dateTime={org.updatedAt}>{formatDateTime(org.updatedAt)}</time>
                  </TableCell>
                </TableRow>
              ))}
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
