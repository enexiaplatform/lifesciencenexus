import Link from "next/link";

import { CategoryBadge, EntityBadges, ProductStatusBadge } from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { FilterBar } from "@/components/products/filter-bar";
import { humanize } from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { Pagination } from "@/components/products/pagination";
import { one, pageParam, type SearchParams } from "@/components/products/search-params";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import { PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Products" };

const PAGE_SIZE = 12;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = one(sp.query);
  const category = one(sp.category);
  const status = one(sp.status);
  const page = pageParam(sp.page);

  const repo = await getRepository();
  const filters: Record<string, string> = {};
  if (category) filters.category = category;
  if (status) filters.status = status;

  const [paged, families, brands, organizations, skus] = await Promise.all([
    repo.list("product", {
      query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort: { field: "name", direction: "asc" },
      page,
      pageSize: PAGE_SIZE,
    }),
    repo.list("product_family", { pageSize: 500 }),
    repo.list("brand", { pageSize: 500 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("sku", { pageSize: 500 }),
  ]);

  const familyById = new Map(families.items.map((family) => [family.id, family]));
  const brandById = new Map(brands.items.map((brand) => [brand.id, brand]));
  const orgById = new Map(organizations.items.map((org) => [org.id, org]));
  const skuCountByProduct = new Map<string, number>();
  for (const sku of skus.items) {
    skuCountByProduct.set(sku.productId, (skuCountByProduct.get(sku.productId) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Canonical product catalog across manufacturers, brands and categories. Status, taxonomy and evidence state are shown for every record."
      />

      <FilterBar
        basePath="/products"
        query={{ label: "Search", placeholder: "Name, category…", value: query }}
        selects={[
          {
            name: "category",
            label: "Category",
            value: category,
            options: PRODUCT_CATEGORIES.map((c) => ({ value: c, label: humanize(c) })),
          },
          {
            name: "status",
            label: "Status",
            value: status,
            options: PRODUCT_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
          },
        ]}
      />

      {paged.items.length === 0 ? (
        <EmptyState
          title="No products match the current filters"
          description="Adjust the search text or reset the category/status filters."
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">SKUs</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.items.map((product) => {
                const family = familyById.get(product.familyId);
                const brand = family ? brandById.get(family.brandId) : undefined;
                const manufacturer = orgById.get(product.manufacturerOrganizationId);
                return (
                  <TableRow
                    key={product.id}
                    className={cn(product.status === "discontinued" && "bg-red-50/50")}
                  >
                    <TableCell>
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">{family?.name ?? "—"}</TableCell>
                    <TableCell className="text-slate-600">{brand?.name ?? "—"}</TableCell>
                    <TableCell className="text-slate-600">
                      {manufacturer ? (
                        <Link
                          href={`/organizations/${manufacturer.id}`}
                          className="hover:text-accent hover:underline"
                        >
                          {manufacturer.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={product.category} />
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">
                      {skuCountByProduct.get(product.id) ?? 0}
                    </TableCell>
                    <TableCell>
                      <EntityBadges visibility={product.visibility} isDemo={product.isDemo} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        basePath="/products"
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        pageSize={paged.pageSize}
        params={{ query, category, status }}
      />
    </div>
  );
}
