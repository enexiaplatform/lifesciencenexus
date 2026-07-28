import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import {
  EntityBadges,
  FreshnessBadge,
  SyntheticBadge,
} from "@/components/products/badges";
import { EmptyState } from "@/components/products/empty-state";
import { FilterBar } from "@/components/products/filter-bar";
import {
  ConfidenceValue,
  DateText,
  formatUnitAmount,
  humanize,
  Money,
} from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { one, type SearchParams } from "@/components/products/search-params";
import { SourceChip } from "@/components/products/source-chip";
import { PriceHistoryChart } from "@/components/intelligence/price-history-chart";
import { RecordPriceDialog } from "@/components/intelligence/record-price-dialog";
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
import { aggregateConfidence } from "@/lib/domain/confidence";
import { detectOutliers, priceFreshness } from "@/lib/domain/price-normalization";
import { VISIBILITIES } from "@/lib/domain/types";

import { recordPrice } from "./actions";

export const metadata = { title: "Prices" };

export default async function PricesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const skuFilter = one(sp.sku);
  const currencyFilter = one(sp.currency);
  const visibilityFilter = one(sp.visibility);
  const freshnessFilter = one(sp.freshness);

  const repo = await getRepository();
  const filters: Record<string, string> = {};
  if (skuFilter) filters.skuId = skuFilter;
  if (currencyFilter) filters.originalCurrency = currencyFilter;
  if (visibilityFilter) filters.visibility = visibilityFilter;

  const [prices, skus, organizations, sources, packs] = await Promise.all([
    repo.list("price_observation", {
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort: { field: "observationDate", direction: "desc" },
      pageSize: 500,
    }),
    repo.list("sku", { sort: { field: "name", direction: "asc" }, pageSize: 500 }),
    repo.list("organization", { pageSize: 500 }),
    repo.list("source", { pageSize: 500 }),
    repo.list("pack_configuration", { pageSize: 500 }),
  ]);

  const skuById = new Map(skus.items.map((sku) => [sku.id, sku]));
  const orgById = new Map(organizations.items.map((org) => [org.id, org]));
  const sourceById = new Map(sources.items.map((source) => [source.id, source]));

  // Freshness per row (computed now); freshness filter applies afterwards.
  const rows = prices.items.map((price) => ({
    price,
    freshness: priceFreshness(price.observationDate),
    exTax:
      price.taxIncluded && price.vatRate !== undefined
        ? price.originalAmount / (1 + price.vatRate)
        : null,
  }));
  const filteredRows = freshnessFilter
    ? rows.filter((row) => row.freshness.bucket === freshnessFilter)
    : rows;

  // Outlier detection within the filtered set, per currency group.
  const amountsByCurrency = new Map<string, number[]>();
  for (const row of filteredRows) {
    const list = amountsByCurrency.get(row.price.originalCurrency) ?? [];
    list.push(row.price.originalAmount);
    amountsByCurrency.set(row.price.originalCurrency, list);
  }
  const outlierAmounts = new Set<number>();
  for (const amounts of amountsByCurrency.values()) {
    for (const outlier of detectOutliers(amounts).outliers) outlierAmounts.add(outlier);
  }

  const staleRows = rows.filter((row) => row.freshness.bucket === "stale");

  const currencies = [...new Set(rows.map((row) => row.price.originalCurrency))].sort();

  // History chart when a single SKU is filtered (all its rows, any freshness).
  const skuRows = skuFilter ? rows : [];
  const skuChartCurrencies = [...new Set(skuRows.map((row) => row.price.originalCurrency))];
  const chartData = [...skuRows]
    .sort((a, b) => a.price.observationDate.localeCompare(b.price.observationDate))
    .map((row) => ({ date: row.price.observationDate, amount: row.price.originalAmount }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prices"
        description="Immutable price observations with provenance, freshness and engine-computed normalization. Stale observations are flagged, never silently trusted."
        actions={
          <RecordPriceDialog
            skus={skus.items.map((sku) => ({
              id: sku.id,
              label: sku.catalogueNumber ? `${sku.name} (${sku.catalogueNumber})` : sku.name,
            }))}
            packs={packs.items.map((pack) => ({
              id: pack.id,
              skuId: pack.skuId,
              label: pack.description ?? `${pack.quantity} ${pack.unit}`,
            }))}
            suppliers={organizations.items.map((org) => ({ id: org.id, label: org.name }))}
            sources={sources.items.map((source) => ({ id: source.id, label: source.title }))}
            recordPrice={recordPrice}
          />
        }
      />

      {staleRows.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {staleRows.length} stale price observation{staleRows.length === 1 ? "" : "s"} (older
              than 180 days)
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {staleRows.map((row) => (
                <li key={row.price.id}>
                  {skuById.get(row.price.skuId)?.name ?? row.price.skuId} —{" "}
                  {row.price.supplierOrgId
                    ? (orgById.get(row.price.supplierOrgId)?.name ?? row.price.supplierOrgId)
                    : "unknown supplier"}
                  , observed {row.price.observationDate} ({row.freshness.daysSince} days ago)
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <FilterBar
        basePath="/prices"
        selects={[
          {
            name: "sku",
            label: "SKU",
            value: skuFilter,
            options: skus.items.map((sku) => ({ value: sku.id, label: sku.name })),
          },
          {
            name: "currency",
            label: "Currency",
            value: currencyFilter,
            options: currencies.map((currency) => ({ value: currency, label: currency })),
          },
          {
            name: "visibility",
            label: "Visibility",
            value: visibilityFilter,
            options: VISIBILITIES.map((visibility) => ({
              value: visibility,
              label: humanize(visibility),
            })),
          },
          {
            name: "freshness",
            label: "Freshness",
            value: freshnessFilter,
            options: [
              { value: "fresh", label: "Fresh (≤ 90 days)" },
              { value: "aging", label: "Aging (91–180 days)" },
              { value: "stale", label: "Stale (> 180 days)" },
            ],
          },
        ]}
      />

      {skuFilter && skuRows.length > 0 ? (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">
              Price history — {skuById.get(skuFilter)?.name ?? skuFilter}
            </CardTitle>
            <CardDescription className="text-xs">
              {skuRows.length} observation{skuRows.length === 1 ? "" : "s"}, original amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {skuChartCurrencies.length === 1 ? (
              <PriceHistoryChart data={chartData} currency={skuChartCurrencies[0]} />
            ) : (
              <p className="text-xs text-slate-500">
                This SKU has observations in {skuChartCurrencies.join(" and ")} — a single-axis
                chart would mix currencies, so it is not drawn.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {filteredRows.length === 0 ? (
        <EmptyState
          title="No price observations match the filters"
          description="Reset the filters or record a new observation."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Ex-tax</TableHead>
                  <TableHead className="text-right">Per unit</TableHead>
                  <TableHead className="text-right">Per test</TableHead>
                  <TableHead>Incoterm</TableHead>
                  <TableHead>Geo</TableHead>
                  <TableHead>Freshness</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(({ price, freshness, exTax }) => {
                  const sku = skuById.get(price.skuId);
                  const source = sourceById.get(price.sourceId);
                  const isOutlier = outlierAmounts.has(price.originalAmount);
                  return (
                    <TableRow key={price.id}>
                      <TableCell>
                        <DateText date={price.observationDate} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/skus/${price.skuId}`} className="font-medium text-accent hover:underline">
                          {sku?.name ?? price.skuId}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {price.supplierOrgId
                          ? (orgById.get(price.supplierOrgId)?.name ?? price.supplierOrgId)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money amount={price.originalAmount} currency={price.originalCurrency} />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-600">
                        {exTax !== null ? (
                          <span title="VAT treated as recoverable">
                            {formatUnitAmount(exTax, price.originalCurrency)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-700">
                        {price.normalizedPerUnitAmount != null && price.normalizedPerUnitCurrency
                          ? formatUnitAmount(
                              price.normalizedPerUnitAmount,
                              price.normalizedPerUnitCurrency,
                              price.normalizedPerUnit,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-700">
                        {price.normalizedPerTestAmount != null && price.normalizedPerUnitCurrency
                          ? formatUnitAmount(price.normalizedPerTestAmount, price.normalizedPerUnitCurrency, "test")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">{price.incoterm ?? "—"}</TableCell>
                      <TableCell className="text-slate-600">{price.geography}</TableCell>
                      <TableCell>
                        <FreshnessBadge bucket={freshness.bucket} daysSince={freshness.daysSince} />
                      </TableCell>
                      <TableCell>
                        <ConfidenceValue value={aggregateConfidence(price.confidence)} />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex flex-wrap gap-1">
                          <EntityBadges visibility={price.visibility} isDemo={price.isDemo} />
                          {price.isSynthetic ? <SyntheticBadge /> : null}
                          {isOutlier ? (
                            <Badge
                              variant="outline"
                              className="border-orange-400 bg-orange-50 text-orange-800"
                              title="Outside the 1.5×IQR fence within the filtered set (per currency)"
                            >
                              Outlier
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <SourceChip sourceId={price.sourceId} title={source?.title} type={source?.type} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500">
        {filteredRows.length} observation{filteredRows.length === 1 ? "" : "s"}
        {outlierAmounts.size > 0
          ? ` · ${outlierAmounts.size} outlier amount${outlierAmounts.size === 1 ? "" : "s"} flagged by Tukey IQR fences (per currency, within the filtered set)`
          : ""}
        .
      </p>
    </div>
  );
}
