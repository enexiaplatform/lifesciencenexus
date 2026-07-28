import Link from "next/link";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import {
  ClassificationBadge,
  DomainEvidenceBadge,
  EntityBadges,
  ProductStatusBadge,
} from "@/components/products/badges";
import { ConfidenceValue, DateText, humanize, ScoreBar } from "@/components/products/format";
import { PageHeader } from "@/components/products/page-header";
import { EquivalenceWorkspace } from "@/components/intelligence/equivalence-workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRepository } from "@/lib/data";
import { EQUIVALENCE_DISCLAIMER } from "@/lib/domain/equivalence";
import type { SkuDetail } from "@/lib/data";

import {
  markEquivalenceAnalystReviewed,
  saveEquivalenceAssessment,
  submitEquivalenceForReview,
} from "../actions";

export const metadata = { title: "Equivalence workspace" };

function SkuCard({ title, detail }: { title: string; detail: SkuDetail | null }) {
  if (!detail) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs">{title}</CardDescription>
          <CardTitle className="text-sm text-slate-500">SKU no longer available</CardTitle>
        </CardHeader>
      </Card>
    );
  }
  const { sku, product, manufacturer } = detail;
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-xs">{title}</CardDescription>
        <CardTitle className="text-sm">
          <Link href={`/skus/${sku.id}`} className="text-accent hover:underline">
            {sku.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0 text-xs text-slate-600">
        <p>
          <span className="text-slate-500">Catalogue:</span>{" "}
          <span className="font-mono">{sku.catalogueNumber ?? "—"}</span>
        </p>
        <p>
          <span className="text-slate-500">Product:</span>{" "}
          {product ? (
            <Link href={`/products/${product.id}`} className="text-accent hover:underline">
              {product.name}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <span className="text-slate-500">Manufacturer:</span> {manufacturer?.name ?? "—"}
        </p>
        <p className="flex items-center gap-2">
          <span className="text-slate-500">Status:</span>
          <ProductStatusBadge status={sku.status} />
        </p>
      </CardContent>
    </Card>
  );
}

export default async function EquivalenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getRepository();
  const record = await repo.getById("equivalence_record", id);
  if (!record) notFound();

  const [sourceDetail, candidateDetail] = await Promise.all([
    repo.getSkuDetail(record.sourceSkuId),
    repo.getSkuDetail(record.candidateSkuId),
  ]);
  const claims = (
    await Promise.all(record.evidenceClaimIds.map((claimId) => repo.getById("claim", claimId)))
  ).filter((claim) => claim !== null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equivalence workspace"
        badges={
          <>
            <ClassificationBadge classification={record.classification} />
            <DomainEvidenceBadge state={record.reviewState} />
            <EntityBadges visibility={record.visibility} isDemo={record.isDemo} />
          </>
        }
      />

      <div
        role="note"
        className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
      >
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Decision support only — not a regulatory approval</p>
          <p className="mt-0.5">{EQUIVALENCE_DISCLAIMER}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkuCard title="Source SKU (to be replaced)" detail={sourceDetail} />
        <SkuCard title="Candidate SKU (potential substitute)" detail={candidateDetail} />
      </div>

      <EquivalenceWorkspace
        recordId={record.id}
        reviewState={record.reviewState}
        lastReviewedAt={record.lastReviewedAt ?? null}
        initialClassification={record.classification}
        storedOverallScore={record.overallScore}
        initialDimensionScores={record.dimensionScores}
        initialRationale={record.rationale}
        initialDifferences={record.differences}
        initialValidationConsiderations={record.validationConsiderations}
        save={saveEquivalenceAssessment}
        submitForReview={submitEquivalenceForReview}
        markReviewed={markEquivalenceAnalystReviewed}
      />

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Evidence claims ({claims.length})</CardTitle>
          <CardDescription className="text-xs">
            Claims linked to this assessment as supporting evidence
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {claims.length === 0 ? (
            <p className="text-sm text-slate-500">
              No claims linked. Link claims from the Evidence module to back this assessment.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {claims.map((claim) => (
                <li key={claim.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Badge variant="secondary" className="font-normal">
                    {humanize(claim.predicate)}
                  </Badge>
                  <code className="max-w-md truncate text-xs text-slate-600" title={JSON.stringify(claim.objectValue)}>
                    {JSON.stringify(claim.objectValue)}
                  </code>
                  <DomainEvidenceBadge state={claim.reviewStatus} />
                  <ConfidenceValue value={claim.confidence.sourceAuthority} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        Record updated <DateText date={record.updatedAt} /> · stored overall score{" "}
        <ScoreBar score={record.overallScore} />
      </p>
    </div>
  );
}
