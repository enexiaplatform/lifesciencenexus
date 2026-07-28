import type { Metadata } from "next";

import { getRepository } from "@/lib/data";
import { claimValueText } from "@/components/evidence/format";
import { SourcesTable, type SourceRow } from "@/components/evidence/sources-table";
import { AddSourceDialog } from "@/components/evidence/add-source-dialog";

export const metadata: Metadata = { title: "Sources" };

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const dialogParam = Array.isArray(params.dialog) ? params.dialog[0] : params.dialog;

  const repo = await getRepository();
  const [sources, claims, documents] = await Promise.all([
    repo.list("source", {
      pageSize: 200,
      sort: { field: "capturedAt", direction: "desc" },
    }),
    repo.list("claim", { pageSize: 500 }),
    repo.list("source_document", { pageSize: 200 }),
  ]);

  const claimsBySource = new Map<string, typeof claims.items>();
  for (const claim of claims.items) {
    const bucket = claimsBySource.get(claim.sourceId) ?? [];
    bucket.push(claim);
    claimsBySource.set(claim.sourceId, bucket);
  }

  const documentNameById = new Map(documents.items.map((doc) => [doc.id, doc.fileName]));
  const documentNameBySource = new Map(
    documents.items
      .filter((doc) => doc.sourceId)
      .map((doc) => [doc.sourceId as string, doc.fileName]),
  );

  const rows: SourceRow[] = sources.items.map((source) => {
    const sourceClaims = claimsBySource.get(source.id) ?? [];
    return {
      id: source.id,
      type: source.type,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      publishedAt: source.publishedAt,
      capturedAt: source.capturedAt,
      notes: source.notes,
      visibility: source.visibility,
      isDemo: source.isDemo,
      documentFileName:
        (source.documentId ? documentNameById.get(source.documentId) : undefined) ??
        documentNameBySource.get(source.id),
      claims: sourceClaims.map((claim) => ({
        id: claim.id,
        predicate: claim.predicate,
        valueText: claimValueText(claim.objectValue),
        reviewStatus: claim.reviewStatus,
      })),
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sources</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Every claim in the graph traces back to one of these evidence sources. Expand a
            row to see the claims it backs.
          </p>
        </div>
        <AddSourceDialog defaultOpen={dialogParam === "add"} />
      </div>
      <SourcesTable rows={rows} />
    </div>
  );
}
