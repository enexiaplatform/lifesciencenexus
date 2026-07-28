import Link from "next/link";
import { FileText } from "lucide-react";

import { DemoBadge, StatusBadge } from "@/components/market/badges";
import { EmptyState } from "@/components/market/empty-state";
import { FilterBar, FilterQuery, FilterSelect } from "@/components/market/filter-bar";
import { TENDER_STATUS_LABELS, countryName, formatDate } from "@/components/market/labels";
import { PageHeader } from "@/components/market/page-header";
import { Pagination } from "@/components/market/pagination";
import { firstParam, flattenParams, pageParam, type SearchParams } from "@/components/market/search-params";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { daysUntil } from "@/lib/domain/freshness";
import { TENDER_STATUSES, type TenderStatus } from "@/lib/domain/types";

import { CreateTenderDialog } from "./create-tender-dialog";

export const metadata = { title: "Tenders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

const statusTones: Record<TenderStatus, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  published: "success",
  closed: "warning",
  awarded: "secondary",
  cancelled: "destructive",
  unknown: "outline",
};

export default async function TendersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = firstParam(params.query);
  const statusFilter = firstParam(params.status);
  const page = pageParam(params.page);

  const repo = await getRepository();

  const [result, orgs] = await Promise.all([
    repo.list("tender", {
      query: query || undefined,
      filters:
        statusFilter && (TENDER_STATUSES as readonly string[]).includes(statusFilter)
          ? { status: statusFilter }
          : undefined,
      sort: { field: "publicationDate", direction: "desc" },
      page,
      pageSize: PAGE_SIZE,
    }),
    repo.list("organization", { pageSize: 500 }),
  ]);

  const orgById = new Map(orgs.items.map((org) => [org.id, org]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenders"
        description="Public and private procurement tenders tracked from tender dossiers. Open tenders show a days-to-deadline countdown."
        actions={<CreateTenderDialog organizations={orgs.items.map((org) => ({ id: org.id, name: org.name }))} />}
      />

      <FilterBar>
        <FilterQuery value={query} placeholder="Code or title…" />
        <FilterSelect
          name="status"
          label="Status"
          value={statusFilter}
          options={TENDER_STATUSES.map((status) => ({ value: status, label: TENDER_STATUS_LABELS[status] }))}
          allLabel="All statuses"
        />
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tenders match these filters"
          description="Record a tender dossier to start tracking lots, bidders and awards."
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Awarded</TableHead>
                <TableHead className="text-right">Days to deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((tender) => {
                const buyer = orgById.get(tender.buyerOrganizationId);
                const daysLeft = tender.submissionDeadline ? daysUntil(tender.submissionDeadline) : null;
                return (
                  <TableRow key={tender.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/tenders/${tender.id}`}
                          className="font-mono text-xs font-medium text-accent hover:underline"
                        >
                          {tender.code}
                        </Link>
                        <DemoBadge isDemo={tender.isDemo} />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <Link href={`/tenders/${tender.id}`} className="hover:underline">
                        {tender.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {buyer ? (
                        <Link href={`/organizations/${buyer.id}`} className="text-accent hover:underline">
                          {buyer.name}
                        </Link>
                      ) : (
                        tender.buyerOrganizationId
                      )}
                    </TableCell>
                    <TableCell title={countryName(tender.country)}>{tender.country}</TableCell>
                    <TableCell>
                      <StatusBadge label={TENDER_STATUS_LABELS[tender.status]} tone={statusTones[tender.status]} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDate(tender.publicationDate)}</TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDate(tender.submissionDeadline)}</TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDate(tender.awardDate)}</TableCell>
                    <TableCell className="text-right">
                      {tender.status === "published" && daysLeft !== null ? (
                        daysLeft < 0 ? (
                          <StatusBadge label={`${-daysLeft} d overdue`} tone="destructive" />
                        ) : daysLeft <= 14 ? (
                          <StatusBadge label={`${daysLeft} d`} tone="warning" />
                        ) : (
                          <span className="tabular-nums text-xs text-slate-700">{daysLeft} d</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
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
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        searchParams={flattenParams(params)}
      />
    </div>
  );
}
