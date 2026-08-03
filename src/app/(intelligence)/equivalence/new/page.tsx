import { PageHeader } from "@/components/products/page-header";
import { NewEquivalenceForm } from "@/components/intelligence/new-equivalence-form";
import { getRepository } from "@/lib/data";
import { EQUIVALENCE_DISCLAIMER } from "@/lib/domain/equivalence";

import { createEquivalenceShell } from "../actions";

export const metadata = { title: "New equivalence" };

export default async function NewEquivalencePage() {
  const repo = await getRepository();
  const skus = await repo.list("sku", {
    sort: { field: "name", direction: "asc" },
    pageSize: 500,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="New equivalence assessment"
        description="Pick the SKU you need to replace (source) and the SKU you are evaluating as a substitute (candidate). A draft record with default dimension weights is created; you score it in the workspace."
      />
      <p className="rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-fg">
        {EQUIVALENCE_DISCLAIMER}
      </p>
      <NewEquivalenceForm
        options={skus.items.map((sku) => ({
          value: sku.id,
          label: sku.name,
          hint: [sku.catalogueNumber, sku.status === "discontinued" ? "discontinued" : null]
            .filter(Boolean)
            .join(" · "),
        }))}
        createShell={createEquivalenceShell}
      />
    </div>
  );
}
