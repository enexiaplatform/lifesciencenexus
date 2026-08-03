import { CompareMatrix, type CompareSku } from "@/components/intelligence/compare-matrix";
import { ComparePicker } from "@/components/intelligence/compare-picker";
import { EmptyState } from "@/components/products/empty-state";
import { PageHeader } from "@/components/products/page-header";
import { one, type SearchParams } from "@/components/products/search-params";
import { Card, CardContent } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import { normalizePack } from "@/lib/domain/units";
import type { ProductEdgeTargetType } from "@/lib/domain/types";

export const metadata = { title: "Compare SKUs" };

const SET_ROW_TARGETS: ProductEdgeTargetType[] = ["standard", "organism", "application"];

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const selectedIds = (one(sp.skus) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);

  const repo = await getRepository();
  const [allSkus, sources] = await Promise.all([
    repo.list("sku", { sort: { field: "name", direction: "asc" }, pageSize: 500 }),
    repo.list("source", { pageSize: 500 }),
  ]);
  const sourceTitleById = new Map(sources.items.map((source) => [source.id, source.title]));

  const details = await Promise.all(selectedIds.map((id) => repo.getSkuDetail(id)));

  const compareSkus: CompareSku[] = [];
  const missingIds: string[] = [];
  details.forEach((detail, index) => {
    if (!detail) {
      missingIds.push(selectedIds[index]);
      return;
    }
    const { sku, format, packConfigurations, edges } = detail;
    const firstPack = packConfigurations[0];
    const normalized = firstPack
      ? normalizePack({
          quantity: firstPack.quantity,
          unit: firstPack.unit,
          unitsPerPack: firstPack.unitsPerPack,
        })
      : null;
    const setValues = (targetType: ProductEdgeTargetType) =>
      edges
        .filter((edge) => edge.targetType === targetType)
        .map((edge) => ({
          value: edge.targetName ?? edge.targetId,
          sourceTitle: edge.evidence.sourceId
            ? (sourceTitleById.get(edge.evidence.sourceId) ?? null)
            : null,
        }))
        .sort((a, b) => a.value.localeCompare(b.value));

    compareSkus.push({
      id: sku.id,
      name: sku.name,
      catalogueNumber: sku.catalogueNumber ?? null,
      status: sku.status,
      packLabel: firstPack
        ? (normalized?.label ?? `${firstPack.quantity} ${firstPack.unit}`)
        : null,
      shelfLifeMonths: sku.shelfLifeMonths ?? null,
      storageCondition: sku.storageCondition ?? null,
      formatName: format?.name ?? null,
      standards: setValues("standard"),
      organisms: setValues("organism"),
      applications: setValues("application"),
    });
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compare SKUs"
        description="Side-by-side spec matrix for 2–4 SKUs. The first selected SKU is the reference; verdicts compare each SKU against it. Unknown is shown distinctly from not met."
      />
      <Card className="no-print">
        <CardContent className="p-4">
          <ComparePicker
            options={allSkus.items.map((sku) => ({
              value: sku.id,
              label: sku.name,
              hint: [sku.catalogueNumber, sku.status === "discontinued" ? "discontinued" : null]
                .filter(Boolean)
                .join(" · "),
            }))}
            selectedIds={compareSkus.map((sku) => sku.id)}
          />
        </CardContent>
      </Card>

      {missingIds.length > 0 ? (
        <p role="alert" className="rounded-md border border-warning-border bg-warning-bg p-3 text-xs text-warning-fg">
          These SKU ids could not be loaded and were skipped: {missingIds.join(", ")}
        </p>
      ) : null}

      {compareSkus.length >= 2 ? (
        <CompareMatrix skus={compareSkus} />
      ) : (
        <EmptyState
          title="Select at least two SKUs to build the comparison matrix"
          description={`Set rows cover standards, organisms and applications from evidence edges (${SET_ROW_TARGETS.join(", ")}); spec rows come from the SKU records.`}
        />
      )}
    </div>
  );
}
