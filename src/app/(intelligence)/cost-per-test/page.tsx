import { CostBuilder, type CostSkuOption } from "@/components/intelligence/cost-builder";
import { PageHeader } from "@/components/products/page-header";
import { getRepository } from "@/lib/data";
import { normalizePack } from "@/lib/domain/units";

import { saveCostScenario } from "./actions";

export const metadata = { title: "Cost per test" };

export default async function CostPerTestPage() {
  const repo = await getRepository();
  const [skus, packs, prices, scenarios, projects] = await Promise.all([
    repo.list("sku", { sort: { field: "name", direction: "asc" }, pageSize: 500 }),
    repo.list("pack_configuration", { pageSize: 500 }),
    repo.list("price_observation", {
      sort: { field: "observationDate", direction: "desc" },
      pageSize: 500,
    }),
    repo.list("cost_per_test_scenario", { pageSize: 100 }),
    repo.list("research_project", { pageSize: 100 }),
  ]);

  // Prices are sorted newest-first: the first row seen per SKU is the latest.
  const firstPackBySku = new Map<string, (typeof packs.items)[number]>();
  for (const pack of packs.items) {
    if (!firstPackBySku.has(pack.skuId)) firstPackBySku.set(pack.skuId, pack);
  }
  const latestPriceBySku = new Map<string, (typeof prices.items)[number]>();
  for (const price of prices.items) {
    if (!latestPriceBySku.has(price.skuId)) latestPriceBySku.set(price.skuId, price);
  }

  const skuOptions: CostSkuOption[] = skus.items.map((sku) => {
    const pack = firstPackBySku.get(sku.id);
    const normalized = pack
      ? normalizePack({ quantity: pack.quantity, unit: pack.unit, unitsPerPack: pack.unitsPerPack })
      : null;
    const latest = latestPriceBySku.get(sku.id);
    return {
      id: sku.id,
      name: sku.name,
      catalogueNumber: sku.catalogueNumber ?? null,
      packDescription: pack?.description ?? null,
      normalizedPackLabel: normalized?.label ?? null,
      packQuantity: normalized?.totalBaseQuantity ?? null,
      packUnit: normalized?.baseUnit ?? null,
      latestPrice: latest
        ? {
            id: latest.id,
            amount: latest.originalAmount,
            currency: latest.originalCurrency,
            vatRate: latest.vatRate ?? null,
            taxIncluded: latest.taxIncluded,
            date: latest.observationDate,
          }
        : null,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cost per test"
        description="Fully attributable cost of one test from a purchasable pack. The engine lists every component and assumption — currencies only convert through an explicit exchange-rate snapshot."
      />
      <CostBuilder
        skuOptions={skuOptions}
        savedScenarios={scenarios.items.map((scenario) => ({
          id: scenario.id,
          name: scenario.name,
          skuId: scenario.skuId ?? null,
          input: scenario.input,
        }))}
        projects={projects.items.map((project) => ({ id: project.id, title: project.title }))}
        saveScenario={saveCostScenario}
      />
    </div>
  );
}
