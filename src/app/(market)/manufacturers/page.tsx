import Link from "next/link";
import { Factory } from "lucide-react";

import { DemoBadge, VisibilityBadge } from "@/components/market/badges";
import { EmptyState } from "@/components/market/empty-state";
import { FilterBar, FilterQuery } from "@/components/market/filter-bar";
import { ORGANIZATION_TYPE_LABELS, PRODUCT_CATEGORY_LABELS, countryName } from "@/components/market/labels";
import { PageHeader } from "@/components/market/page-header";
import { firstParam, type SearchParams } from "@/components/market/search-params";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Manufacturers" };
export const dynamic = "force-dynamic";

export default async function ManufacturersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = firstParam(params.query);

  const repo = await getRepository();

  // Manufacturers = organizations typed manufacturer and/or brand_owner.
  const [manufacturers, brandOwners, brands, products] = await Promise.all([
    repo.list("organization", {
      query: query || undefined,
      filters: { types: "manufacturer" },
      sort: { field: "name", direction: "asc" },
      pageSize: 200,
    }),
    repo.list("organization", {
      query: query || undefined,
      filters: { types: "brand_owner" },
      sort: { field: "name", direction: "asc" },
      pageSize: 200,
    }),
    repo.list("brand", { pageSize: 500 }),
    repo.list("product", { pageSize: 500 }),
  ]);

  const byId = new Map([...manufacturers.items, ...brandOwners.items].map((org) => [org.id, org]));
  const organizations = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));

  const brandsByOwner = new Map<string, typeof brands.items>();
  for (const brand of brands.items) {
    const list = brandsByOwner.get(brand.ownerOrganizationId) ?? [];
    list.push(brand);
    brandsByOwner.set(brand.ownerOrganizationId, list);
  }
  const productsByManufacturer = new Map<string, typeof products.items>();
  for (const product of products.items) {
    const list = productsByManufacturer.get(product.manufacturerOrganizationId) ?? [];
    list.push(product);
    productsByManufacturer.set(product.manufacturerOrganizationId, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturers"
        description="Organizations that manufacture products or own brands in the graph, with their brand and product footprint."
      />

      <FilterBar>
        <FilterQuery value={query} placeholder="Search manufacturers…" />
      </FilterBar>

      {organizations.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No manufacturers found"
          description="No organization typed as manufacturer or brand owner matches the search."
          action={{ label: "Browse all organizations", href: "/organizations" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((org) => {
            const orgBrands = brandsByOwner.get(org.id) ?? [];
            const orgProducts = productsByManufacturer.get(org.id) ?? [];
            const activeProducts = orgProducts.filter((product) => product.status === "active").length;
            const categories = [...new Set(orgProducts.map((product) => product.category))];
            return (
              <Card key={org.id} className="flex flex-col">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      <Link href={`/organizations/${org.id}`} className="text-accent hover:underline">
                        {org.name}
                      </Link>
                    </CardTitle>
                    <VisibilityBadge visibility={org.visibility} />
                    <DemoBadge isDemo={org.isDemo} />
                  </div>
                  <CardDescription>
                    {org.country} — {countryName(org.country)}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1">
                    {org.types.map((type) => (
                      <Badge key={type} variant="secondary">
                        {ORGANIZATION_TYPE_LABELS[type]}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end gap-3 text-sm">
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Brands ({orgBrands.length})
                    </p>
                    {orgBrands.length === 0 ? (
                      <p className="text-xs text-slate-500">None recorded.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {orgBrands.map((brand) => (
                          <Badge key={brand.id} variant="outline">
                            {brand.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-4 text-xs text-slate-600">
                    <span>
                      <span className="text-base font-semibold text-slate-900">{orgProducts.length}</span> products
                    </span>
                    <span>
                      <span className="text-base font-semibold text-teal-700">{activeProducts}</span> active
                    </span>
                  </div>
                  {categories.length > 0 ? (
                    <p className="text-xs text-slate-500">
                      {categories.slice(0, 3).map((category) => PRODUCT_CATEGORY_LABELS[category]).join(" · ")}
                      {categories.length > 3 ? ` · +${categories.length - 3} more` : ""}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
