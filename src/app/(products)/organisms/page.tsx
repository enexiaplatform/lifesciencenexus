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

export const metadata = { title: "Organisms" };

export default async function OrganismsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = one(sp.query);

  const repo = await getRepository();
  const [organisms, edges] = await Promise.all([
    repo.list("organism", { sort: { field: "genus", direction: "asc" }, pageSize: 200 }),
    repo.list("product_edge", { filters: { targetType: "organism" }, pageSize: 1000 }),
  ]);

  // Query filter across genus, species and strain code.
  const normalized = query?.toLowerCase();
  const filtered = normalized
    ? organisms.items.filter((organism) =>
        `${organism.genus} ${organism.species} ${organism.strainCode ?? ""}`
          .toLowerCase()
          .includes(normalized),
      )
    : organisms.items;

  const productIdsByOrganism = new Map<string, Set<string>>();
  for (const edge of edges.items) {
    const set = productIdsByOrganism.get(edge.targetId) ?? new Set<string>();
    set.add(edge.productId);
    productIdsByOrganism.set(edge.targetId, set);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Organisms"
        description="Reference organisms and QC strains linked to media and reference materials."
      />
      <FilterBar
        basePath="/organisms"
        query={{ label: "Search", placeholder: "Genus, species or strain code…", value: query }}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No organisms match the search" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organism</TableHead>
                  <TableHead>Strain code</TableHead>
                  <TableHead>Gram reaction</TableHead>
                  <TableHead className="text-right">Linked products</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((organism) => (
                  <TableRow key={organism.id}>
                    <TableCell className="font-medium italic text-slate-800">
                      {organism.genus} {organism.species}
                    </TableCell>
                    <TableCell>
                      {organism.strainCode ? (
                        <Badge variant="secondary" className="font-mono text-xs font-normal">
                          {organism.strainCode}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {organism.gramReaction ? humanize(organism.gramReaction) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">
                      {productIdsByOrganism.get(organism.id)?.size ?? 0}
                    </TableCell>
                    <TableCell>
                      <EntityBadges visibility={organism.visibility} isDemo={organism.isDemo} />
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
