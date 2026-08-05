import Link from "next/link";

import { CATEGORY_INFO, categoryHref } from "@/components/products/categories";
import { PageHeader } from "@/components/products/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import { PRODUCT_CATEGORIES } from "@/lib/domain/types";

export const metadata = { title: "Categories" };

/**
 * Category shelves: the buyer entry point when the need is a product TYPE
 * ("a closed sterility testing system"), not a known brand or SKU.
 */
export default async function CategoriesPage() {
  const repo = await getRepository();
  const [products, families] = await Promise.all([
    repo.list("product", { pageSize: 500 }),
    repo.list("product_family", { pageSize: 500 }),
  ]);

  const familyById = new Map(families.items.map((family) => [family.id, family]));
  const stats = new Map(PRODUCT_CATEGORIES.map((category) => [category, { products: 0, brands: new Set<string>() }]));
  for (const product of products.items) {
    const bucket = stats.get(product.category);
    if (!bucket) continue;
    bucket.products += 1;
    const family = familyById.get(product.familyId);
    if (family) bucket.brands.add(family.brandId);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product categories"
        description="Browse the catalogue by product type — each category lists the brands and models side by side so you can shortlist before diving into SKUs."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_CATEGORIES.map((category) => {
          const info = CATEGORY_INFO[category];
          const bucket = stats.get(category) ?? { products: 0, brands: new Set<string>() };
          return (
            <Link key={category} href={categoryHref(category)} className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm group-hover:text-accent">{info.label}</CardTitle>
                  <CardDescription className="text-xs">{info.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1 text-xs text-slate-500">
                  {bucket.products} product{bucket.products === 1 ? "" : "s"} · {bucket.brands.size} brand
                  {bucket.brands.size === 1 ? "" : "s"}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
