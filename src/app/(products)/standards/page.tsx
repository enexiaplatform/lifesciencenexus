import { EntityBadges } from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { FilterBar } from "@/components/products/filter-bar";
import { humanize } from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { one, type SearchParams } from "@/components/products/search-params";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Standards" };

const VERSION_STATUS_STYLES: Record<string, string> = {
  current: "border-teal-300 bg-teal-50 text-teal-700",
  superseded: "border-slate-300 bg-slate-50 text-slate-500",
  withdrawn: "border-red-300 bg-red-50 text-red-700",
  unknown: "border-slate-300 bg-slate-50 text-slate-500",
};

export default async function StandardsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = one(sp.query);

  const repo = await getRepository();
  const [standards, versions, edges] = await Promise.all([
    repo.list("standard", { sort: { field: "code", direction: "asc" }, pageSize: 200 }),
    repo.list("standard_version", { pageSize: 500 }),
    repo.list("product_edge", { filters: { targetType: "standard" }, pageSize: 1000 }),
  ]);

  // Query filter across body, code and title.
  const normalized = query?.toLowerCase();
  const filtered = normalized
    ? standards.items.filter((standard) =>
        `${standard.body} ${standard.code} ${standard.title}`.toLowerCase().includes(normalized),
      )
    : standards.items;

  const versionsByStandard = new Map<string, typeof versions.items>();
  for (const version of versions.items) {
    const list = versionsByStandard.get(version.standardId) ?? [];
    list.push(version);
    versionsByStandard.set(version.standardId, list);
  }
  const productIdsByStandard = new Map<string, Set<string>>();
  for (const edge of edges.items) {
    const set = productIdsByStandard.get(edge.targetId) ?? new Set<string>();
    set.add(edge.productId);
    productIdsByStandard.set(edge.targetId, set);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Standards"
        description="Regulatory and quality standards with their known versions and product coverage."
      />
      <FilterBar
        basePath="/standards"
        query={{ label: "Search", placeholder: "Body, code or title…", value: query }}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No standards match the search" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Standard</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead className="text-right">Linked products</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((standard) => {
                  const standardVersions = versionsByStandard.get(standard.id) ?? [];
                  return (
                    <TableRow key={standard.id}>
                      <TableCell className="whitespace-nowrap font-medium text-slate-800">
                        {standard.body} {standard.code}
                      </TableCell>
                      <TableCell className="max-w-96 text-slate-600">{standard.title}</TableCell>
                      <TableCell>
                        <span className="inline-flex flex-wrap gap-1">
                          {standardVersions.length === 0 ? (
                            <span className="text-xs italic text-slate-400">no version recorded</span>
                          ) : (
                            standardVersions.map((version) => (
                              <Badge
                                key={version.id}
                                variant="outline"
                                className={cn(
                                  "font-normal",
                                  VERSION_STATUS_STYLES[version.status] ??
                                    VERSION_STATUS_STYLES.unknown,
                                )}
                                title={`Status: ${humanize(version.status)}`}
                              >
                                {version.version}
                                {version.year ? ` (${version.year})` : ""}
                              </Badge>
                            ))
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">
                        {productIdsByStandard.get(standard.id)?.size ?? 0}
                      </TableCell>
                      <TableCell>
                        <EntityBadges visibility={standard.visibility} isDemo={standard.isDemo} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
