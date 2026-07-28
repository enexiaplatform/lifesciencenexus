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

export const metadata = { title: "Methods" };

export default async function MethodsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = one(sp.query);

  const repo = await getRepository();
  const [methods, standards, edges] = await Promise.all([
    repo.list("method", { query, sort: { field: "name", direction: "asc" }, pageSize: 200 }),
    repo.list("standard", { pageSize: 500 }),
    repo.list("product_edge", { filters: { targetType: "method" }, pageSize: 1000 }),
  ]);

  const standardById = new Map(standards.items.map((standard) => [standard.id, standard]));
  const productIdsByMethod = new Map<string, Set<string>>();
  for (const edge of edges.items) {
    const set = productIdsByMethod.get(edge.targetId) ?? new Set<string>();
    set.add(edge.productId);
    productIdsByMethod.set(edge.targetId, set);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Methods"
        description="Laboratory methods and the standards that define them."
      />
      <FilterBar
        basePath="/methods"
        query={{ label: "Search", placeholder: "Method name…", value: query }}
      />
      {methods.items.length === 0 ? (
        <EmptyState title="No methods match the search" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Standards</TableHead>
                  <TableHead className="text-right">Linked products</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.items.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium text-slate-800">{method.name}</TableCell>
                    <TableCell className="max-w-80 text-slate-600">
                      {method.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex flex-wrap gap-1">
                        {(method.standardIds ?? []).map((standardId) => {
                          const standard = standardById.get(standardId);
                          return (
                            <Badge key={standardId} variant="secondary" className="font-normal">
                              {standard ? `${standard.body} ${standard.code}` : standardId}
                            </Badge>
                          );
                        })}
                        {(method.standardIds ?? []).length === 0 ? "—" : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">
                      {productIdsByMethod.get(method.id)?.size ?? 0}
                    </TableCell>
                    <TableCell>
                      <EntityBadges visibility={method.visibility} isDemo={method.isDemo} />
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
