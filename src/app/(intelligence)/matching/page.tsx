import { MatchingExplorer } from "@/components/intelligence/matching-explorer";
import { PageHeader } from "@/components/products/page-header";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Product matching" };

export default async function MatchingPage() {
  const repo = await getRepository();
  const [
    industries,
    applications,
    methods,
    standards,
    sampleTypes,
    organisms,
    formats,
    products,
    edges,
    skus,
    prices,
    availability,
    listings,
  ] = await Promise.all([
    repo.list("industry", { pageSize: 200 }),
    repo.list("application", { sort: { field: "name", direction: "asc" }, pageSize: 200 }),
    repo.list("method", { sort: { field: "name", direction: "asc" }, pageSize: 200 }),
    repo.list("standard", { sort: { field: "code", direction: "asc" }, pageSize: 200 }),
    repo.list("sample_type", { sort: { field: "name", direction: "asc" }, pageSize: 200 }),
    repo.list("organism", { sort: { field: "genus", direction: "asc" }, pageSize: 200 }),
    repo.list("product_format", { pageSize: 200 }),
    repo.list("product", { sort: { field: "name", direction: "asc" }, pageSize: 500 }),
    repo.list("product_edge", { pageSize: 1000 }),
    repo.list("sku", { pageSize: 500 }),
    repo.list("price_observation", {
      sort: { field: "observationDate", direction: "desc" },
      pageSize: 500,
    }),
    repo.list("availability_observation", {
      sort: { field: "observedAt", direction: "desc" },
      pageSize: 500,
    }),
    repo.list("supplier_listing", { pageSize: 500 }),
  ]);

  // Latest price and latest availability per SKU (lists are sorted newest-first).
  const latestPriceBySku = new Map<string, { amount: number; currency: string; date: string }>();
  for (const price of prices.items) {
    if (!latestPriceBySku.has(price.skuId)) {
      latestPriceBySku.set(price.skuId, {
        amount: price.originalAmount,
        currency: price.originalCurrency,
        date: price.observationDate,
      });
    }
  }
  const availabilityBySku = new Map<string, string[]>();
  for (const observation of availability.items) {
    const statuses = availabilityBySku.get(observation.skuId) ?? [];
    if (!statuses.includes(observation.status)) statuses.push(observation.status);
    availabilityBySku.set(observation.skuId, statuses);
  }
  const listingCountBySku = new Map<string, number>();
  for (const listing of listings.items) {
    listingCountBySku.set(listing.skuId, (listingCountBySku.get(listing.skuId) ?? 0) + 1);
  }

  const skuExtras = new Map(
    skus.items.map((sku) => [
      sku.id,
      {
        id: sku.id,
        name: sku.name,
        status: sku.status,
        latestPrice: latestPriceBySku.get(sku.id) ?? null,
        availability: availabilityBySku.get(sku.id) ?? [],
        listingCount: listingCountBySku.get(sku.id) ?? 0,
      },
    ]),
  );

  const candidates = products.items.map((product) => ({
    product,
    edges: edges.items.filter((edge) => edge.productId === product.id),
    skus: skus.items.filter((sku) => sku.productId === product.id),
    extras: skus.items
      .filter((sku) => sku.productId === product.id)
      .map((sku) => skuExtras.get(sku.id)!),
  }));

  const countries = [...new Set(skus.items.flatMap((sku) => sku.countryAvailability))].sort();
  const storages = [
    ...new Set(skus.items.map((sku) => sku.storageCondition).filter((v): v is string => Boolean(v))),
  ].sort();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Product matching"
        description="Requirements-driven matching against the evidence graph. The score is matched dimensions / required dimensions — fully explainable, no black box."
      />
      <MatchingExplorer
        options={{
          industries: industries.items.map((item) => ({ id: item.id, label: item.name })),
          applications: applications.items.map((item) => ({ id: item.id, label: item.name })),
          methods: methods.items.map((item) => ({ id: item.id, label: item.name })),
          standards: standards.items.map((item) => ({
            id: item.id,
            label: `${item.body} ${item.code}`,
          })),
          sampleTypes: sampleTypes.items.map((item) => ({ id: item.id, label: item.name })),
          organisms: organisms.items.map((item) => ({
            id: item.id,
            label: [item.genus, item.species, item.strainCode].filter(Boolean).join(" "),
          })),
          formats: formats.items.map((item) => ({ id: item.id, label: item.name })),
          countries,
          storages,
        }}
        candidates={candidates}
      />
    </div>
  );
}
