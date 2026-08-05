import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { AvailabilityBadge, EntityBadges, ProductStatusBadge } from "@/components/products/badges";
import { CATEGORY_INFO } from "@/components/products/categories";
import { EmptyState } from "@/components/products/empty-state";
import { formatMoney } from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRepository } from "@/lib/data";
import {
  PRODUCT_CATEGORIES,
  type AvailabilityObservation,
  type PriceObservation,
  type ProductCategory,
} from "@/lib/domain/types";

export const metadata = { title: "Category" };

function latestBySku<T extends { skuId: string }>(records: T[], dateOf: (record: T) => string): Map<string, T> {
  const latest = new Map<string, T>();
  for (const record of records) {
    const current = latest.get(record.skuId);
    if (!current || dateOf(record) > dateOf(current)) latest.set(record.skuId, record);
  }
  return latest;
}

/**
 * One category shelf: every brand and model of this product type side by
 * side, with the facts a buyer needs to shortlist — current price,
 * availability, standards coverage and (for equipment) compatible
 * consumables.
 */
export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: raw } = await params;
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(raw)) notFound();
  const category = raw as ProductCategory;
  const info = CATEGORY_INFO[category];

  const repo = await getRepository();
  const [
    products,
    families,
    brands,
    organizations,
    skus,
    prices,
    availability,
    listings,
    edges,
    standards,
    applications,
    assetModels,
    compatibilities,
  ] = await Promise.all([
    repo.list("product", { filters: { category }, sort: { field: "name", direction: "asc" }, pageSize: 500 }),
    repo.list("product_family", { pageSize: 500 }),
    repo.list("brand", { pageSize: 500 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("sku", { pageSize: 500 }),
    repo.list("price_observation", { pageSize: 500 }),
    repo.list("availability_observation", { pageSize: 500 }),
    repo.list("supplier_listing", { pageSize: 500 }),
    repo.list("product_edge", { pageSize: 500 }),
    repo.list("standard", { pageSize: 500 }),
    repo.list("application", { pageSize: 500 }),
    info.assetCategory
      ? repo.list("asset_model", { filters: { category: info.assetCategory }, pageSize: 500 })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 500, totalPages: 0 }),
    info.assetCategory
      ? repo.list("consumable_compatibility", { pageSize: 500 })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 500, totalPages: 0 }),
  ]);

  const familyById = new Map(families.items.map((family) => [family.id, family]));
  const brandById = new Map(brands.items.map((brand) => [brand.id, brand]));
  const orgById = new Map(organizations.items.map((org) => [org.id, org]));
  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));
  const standardLabelById = new Map(standards.items.map((standard) => [standard.id, `${standard.body} ${standard.code}`]));
  const applicationNameById = new Map(applications.items.map((application) => [application.id, application.name]));

  const productIds = new Set(products.items.map((product) => product.id));
  const categorySkus = skus.items.filter((sku) => productIds.has(sku.productId));
  const latestPrice = latestBySku<PriceObservation>(prices.items, (price) => price.observationDate);
  const latestAvailability = latestBySku<AvailabilityObservation>(availability.items, (obs) => obs.observedAt);

  const supplierNamesBySku = new Map<string, string[]>();
  for (const listing of listings.items) {
    const supplier = orgById.get(listing.supplierOrgId);
    if (!supplier) continue;
    const names = supplierNamesBySku.get(listing.skuId) ?? [];
    if (!names.includes(supplier.name)) names.push(supplier.name);
    supplierNamesBySku.set(listing.skuId, names);
  }

  // Compatible consumables per brand (equipment shelves only): asset models of
  // this shelf's asset category, joined to their consumable SKUs.
  const consumablesByBrand = new Map<string, Map<string, Array<{ id: string; name: string }>>>();
  if (info.assetCategory) {
    for (const model of assetModels.items) {
      if (!model.brandId) continue;
      const consumables = compatibilities.items
        .filter((compat) => compat.assetModelId === model.id)
        .map((compat) => {
          const consumableSku = skuById.get(compat.skuId);
          return consumableSku ? { id: consumableSku.id, name: consumableSku.name } : null;
        })
        .filter((entry): entry is { id: string; name: string } => entry !== null);
      if (consumables.length === 0) continue;
      const byModel = consumablesByBrand.get(model.brandId) ?? new Map<string, Array<{ id: string; name: string }>>();
      byModel.set(model.model, consumables);
      consumablesByBrand.set(model.brandId, byModel);
    }
  }

  // Group products by brand via their family.
  const productsByBrand = new Map<string, typeof products.items>();
  for (const product of products.items) {
    const family = familyById.get(product.familyId);
    const brandId = family?.brandId ?? "unknown-brand";
    const list = productsByBrand.get(brandId) ?? [];
    list.push(product);
    productsByBrand.set(brandId, list);
  }

  const firstSkuByProduct = new Map<string, (typeof categorySkus)[number]>();
  for (const sku of categorySkus) {
    if (!firstSkuByProduct.has(sku.productId)) firstSkuByProduct.set(sku.productId, sku);
  }

  const compareIds = categorySkus.slice(0, 4).map((sku) => sku.id);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <Link href="/categories" className="hover:text-accent hover:underline">
          Categories
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium text-slate-700">{info.label}</span>
      </nav>

      <PageHeader title={info.label} description={info.description} />

      {info.selectionHints.length > 0 ? (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">How to choose in this category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {info.selectionHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {productsByBrand.size === 0 ? (
        <EmptyState
          title="No products in this category yet"
          description="Once products are classified into this category, the brand and model comparison appears here."
        />
      ) : (
        [...productsByBrand.entries()].map(([brandId, brandProducts]) => {
          const brand = brandById.get(brandId);
          const firstFamily = familyById.get(brandProducts[0]?.familyId ?? "");
          const manufacturer = firstFamily ? orgById.get(brand?.ownerOrganizationId ?? "") : undefined;
          const brandConsumables = consumablesByBrand.get(brandId);
          return (
            <section key={brandId} aria-label={brand?.name ?? "Unknown brand"}>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">{brand?.name ?? "Unknown brand"}</CardTitle>
                  <CardDescription className="text-xs">
                    {manufacturer ? (
                      <>
                        Manufacturer:{" "}
                        <Link href={`/organizations/${manufacturer.id}`} className="text-accent hover:underline">
                          {manufacturer.name}
                        </Link>
                      </>
                    ) : (
                      "Manufacturer unknown"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <Table compact>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Standards</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Latest price</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Suppliers</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brandProducts.map((product) => {
                        const productEdges = edges.items.filter((edge) => edge.productId === product.id);
                        const productSkus = categorySkus.filter((sku) => sku.productId === product.id);
                        const firstSku = firstSkuByProduct.get(product.id);
                        const price = firstSku ? latestPrice.get(firstSku.id) : undefined;
                        const stock = firstSku ? latestAvailability.get(firstSku.id) : undefined;
                        const standardsCovered = [
                          ...new Set(
                            productEdges
                              .filter((edge) => edge.targetType === "standard")
                              .map((edge) => standardLabelById.get(edge.targetId) ?? edge.targetId),
                          ),
                        ];
                        const applicationsCovered = [
                          ...new Set(
                            productEdges
                              .filter((edge) => edge.targetType === "application")
                              .map((edge) => applicationNameById.get(edge.targetId) ?? edge.targetId),
                          ),
                        ];
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <Link href={`/products/${product.id}`} className="font-medium text-accent hover:underline">
                                {product.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {applicationsCovered.length > 0 ? applicationsCovered.join(", ") : "—"}
                            </TableCell>
                            <TableCell>
                              <span className="flex flex-wrap gap-1">
                                {standardsCovered.length > 0
                                  ? standardsCovered.map((standard) => (
                                      <Badge key={standard} variant="secondary" className="text-[10px] font-normal">
                                        {standard}
                                      </Badge>
                                    ))
                                  : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600">
                              {firstSku?.catalogueNumber ?? "—"}
                              {productSkus.length > 1 ? ` (+${productSkus.length - 1})` : ""}
                            </TableCell>
                            <TableCell className="tabular-nums text-slate-700">
                              {price ? (
                                <span title={`Observed ${price.observationDate}`}>
                                  {formatMoney(price.originalAmount, price.originalCurrency)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {stock ? <AvailabilityBadge status={stock.status} /> : <span className="text-slate-400">—</span>}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {firstSku ? (supplierNamesBySku.get(firstSku.id) ?? []).join(", ") || "—" : "—"}
                            </TableCell>
                            <TableCell>
                              <ProductStatusBadge status={product.status} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {brandConsumables ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Compatible consumables
                      </p>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {[...brandConsumables.entries()].map(([model, consumables]) => (
                          <li key={model}>
                            <span className="font-medium">{model}</span>
                            {" → "}
                            {consumables.map((consumable, index) => (
                              <span key={consumable.id}>
                                {index > 0 ? ", " : ""}
                                <Link href={`/skus/${consumable.id}`} className="text-accent hover:underline">
                                  {consumable.name}
                                </Link>
                              </span>
                            ))}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          );
        })
      )}

      {compareIds.length >= 2 ? (
        <p className="text-sm text-slate-600">
          Shortlisted models?{" "}
          <Link href={`/compare?skus=${compareIds.join(",")}`} className="font-medium text-accent hover:underline">
            Open the side-by-side comparison
          </Link>{" "}
          for the first {compareIds.length} SKUs on this shelf.
        </p>
      ) : null}

      <p className="text-xs text-slate-500">
        Data badges: <EntityBadges visibility="canonical" isDemo /> — prices and availability are synthetic demo
        observations, never verified quotes.
      </p>
    </div>
  );
}
