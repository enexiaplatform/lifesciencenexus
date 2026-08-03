import type { Metadata } from "next";

import { getRepository } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { claimValueText } from "@/components/evidence/format";
import { entityDisplayName } from "@/components/search/entity-routes";
import { ClaimsBrowser, type ClaimRow } from "@/components/evidence/claims-browser";

export const metadata: Metadata = { title: "Evidence" };

export default async function EvidencePage() {
  const repo = await getRepository();
  const [claims, sources, reviews] = await Promise.all([
    repo.list("claim", {
      pageSize: 500,
      sort: { field: "updatedAt", direction: "desc" },
    }),
    repo.list("source", { pageSize: 500 }),
    repo.list("evidence_review", { pageSize: 500 }),
  ]);

  const sourceById = new Map(sources.items.map((source) => [source.id, source]));
  const reviewsByClaim = new Map<string, typeof reviews.items>();
  for (const review of reviews.items) {
    const bucket = reviewsByClaim.get(review.claimId) ?? [];
    bucket.push(review);
    reviewsByClaim.set(review.claimId, bucket);
  }

  const rows: ClaimRow[] = await Promise.all(
    claims.items.map(async (claim) => {
      const subject = await repo.getById(claim.subjectEntityType, claim.subjectEntityId);
      const source = sourceById.get(claim.sourceId);
      return {
        id: claim.id,
        subjectEntityType: claim.subjectEntityType,
        subjectEntityId: claim.subjectEntityId,
        subjectTitle: entityDisplayName(subject),
        predicate: claim.predicate,
        valueText: claimValueText(claim.objectValue),
        sourceId: claim.sourceId,
        sourceTitle: source?.title ?? claim.sourceId,
        sourceType: source?.type ?? "internal_note",
        reviewStatus: claim.reviewStatus,
        visibility: claim.visibility,
        isDemo: claim.isDemo,
        reviewByDate: claim.reviewByDate,
        effectiveDate: claim.effectiveDate,
        confidence: claim.confidence,
        contradictingClaimIds: claim.contradictingClaimIds,
        reviewerId: claim.reviewerId,
        updatedAt: claim.updatedAt,
        reviews: (reviewsByClaim.get(claim.id) ?? [])
          .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
          .map((review) => ({
            id: review.id,
            fromState: review.fromState,
            toState: review.toState,
            comment: review.comment,
            reviewerId: review.reviewerId,
            reviewedAt: review.reviewedAt,
          })),
      };
    }),
  );

  // Contradiction references resolved to display labels.
  const claimLabelById = new Map(rows.map((row) => [row.id, `${row.predicate} — ${row.subjectTitle}`]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evidence claims"
        description="Every fact Nexus presents traces to an atomic, source-backed claim with dimensional confidence and a review state."
      />
      <ClaimsBrowser rows={rows} claimLabels={Object.fromEntries(claimLabelById)} />
    </div>
  );
}
