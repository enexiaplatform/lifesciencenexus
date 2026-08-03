import { EntityBadges } from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { FilterBar } from "@/components/products/filter-bar";
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

export const metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = one(sp.query);

  const repo = await getRepository();
  const [applications, edges] = await Promise.all([
    repo.list("application", { query, sort: { field: "name", direction: "asc" }, pageSize: 200 }),
    repo.list("product_edge", { filters: { targetType: "application" }, pageSize: 1000 }),
  ]);

  const productIdsByApplication = new Map<string, Set<string>>();
  for (const edge of edges.items) {
    const set = productIdsByApplication.get(edge.targetId) ?? new Set<string>();
    set.add(edge.productId);
    productIdsByApplication.set(edge.targetId, set);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Intended-use applications linked to products through evidence-carrying edges."
      />
      <FilterBar
        basePath="/applications"
        query={{ label: "Search", placeholder: "Application name…", value: query }}
      />
      {applications.items.length === 0 ? (
        <EmptyState title="No applications match the search" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Industries</TableHead>
                  <TableHead className="text-right">Linked products</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.items.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium text-slate-800">{application.name}</TableCell>
                    <TableCell className="max-w-80 text-slate-600">
                      {application.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex flex-wrap gap-1">
                        {(application.industryCodes ?? []).map((code) => (
                          <Badge key={code} variant="secondary" className="font-normal">
                            {code}
                          </Badge>
                        ))}
                        {(application.industryCodes ?? []).length === 0 ? "—" : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">
                      {productIdsByApplication.get(application.id)?.size ?? 0}
                    </TableCell>
                    <TableCell>
                      <EntityBadges visibility={application.visibility} isDemo={application.isDemo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
