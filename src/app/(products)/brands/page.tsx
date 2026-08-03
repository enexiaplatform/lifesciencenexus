import { EntityBadges } from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { FilterBar } from "@/components/products/filter-bar";
import { PageHeader } from "@/components/products/page-header";
import { one, type SearchParams } from "@/components/products/search-params";
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

export const metadata = { title: "Brands" };

export default async function BrandsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = one(sp.query);

  const repo = await getRepository();
  const [brands, organizations, families, products] = await Promise.all([
    repo.list("brand", { query, sort: { field: "name", direction: "asc" }, pageSize: 200 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("product_family", { pageSize: 500 }),
    repo.list("product", { pageSize: 500 }),
  ]);

  const orgById = new Map(organizations.items.map((org) => [org.id, org]));
  const familyCountByBrand = new Map<string, number>();
  const brandByFamily = new Map<string, string>();
  for (const family of families.items) {
    familyCountByBrand.set(family.brandId, (familyCountByBrand.get(family.brandId) ?? 0) + 1);
    brandByFamily.set(family.id, family.brandId);
  }
  const productCountByBrand = new Map<string, number>();
  for (const product of products.items) {
    const brandId = brandByFamily.get(product.familyId);
    if (brandId) productCountByBrand.set(brandId, (productCountByBrand.get(brandId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        description="Manufacturer-owned brands in the catalog, with the families and products they cover."
      />
      <FilterBar
        basePath="/brands"
        query={{ label: "Search", placeholder: "Brand name…", value: query }}
      />
      {brands.items.length === 0 ? (
        <EmptyState title="No brands match the search" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Owner organization</TableHead>
                  <TableHead className="text-right">Families</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.items.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium text-slate-800">{brand.name}</TableCell>
                    <TableCell className="text-slate-600">
                      {orgById.get(brand.ownerOrganizationId)?.name ?? brand.ownerOrganizationId}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">
                      {familyCountByBrand.get(brand.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">
                      {productCountByBrand.get(brand.id) ?? 0}
                    </TableCell>
                    <TableCell>
                      <EntityBadges visibility={brand.visibility} isDemo={brand.isDemo} />
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
