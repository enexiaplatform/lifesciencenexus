import type { Metadata } from "next";
import { Info } from "lucide-react";

import { getRepository } from "@/lib/data";
import { daysUntilReviewDue, isReviewDue } from "@/lib/domain/freshness";
import type { EvidenceState } from "@/lib/domain/types";
import { claimValueText, formatDateTime } from "@/components/evidence/format";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { entityDisplayName, humanize } from "@/components/search/entity-routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewQueue, type ReviewQueueRow } from "@/components/evidence/review-queue";

export const metadata: Metadata = { title: "Evidence review" };

const QUEUE_STATES: EvidenceState[] = ["unverified", "source_captured"];
const TRACKED_STATES: EvidenceState[] = [
  "unverified",
  "source_captured",
  "structurally_validated",
];

export default async function ReviewPage() {
  const repo = await getRepository();
  const [claims, sources, reviews] = await Promise.all([
    repo.list("claim", { pageSize: 500 }),
    repo.list("source", { pageSize: 500 }),
    repo.list("evidence_review", {
      pageSize: 500,
      sort: { field: "reviewedAt", direction: "desc" },
    }),
  ]);

  const sourceById = new Map(sources.items.map((source) => [source.id, source]));

  // Queue: claims in an early review state, plus anything past its review-by
  // date that has not reached a terminal state.
  const queueClaims = claims.items.filter((claim) => {
    if (QUEUE_STATES.includes(claim.reviewStatus)) return true;
    const terminal: EvidenceState[] = ["superseded", "disputed", "expired"];
    return isReviewDue(claim.reviewByDate) && !terminal.includes(claim.reviewStatus);
  });

  const queueRows: ReviewQueueRow[] = await Promise.all(
    queueClaims.map(async (claim) => {
      const subject = await repo.getById(claim.subjectEntityType, claim.subjectEntityId);
      const source = sourceById.get(claim.sourceId);
      return {
        id: claim.id,
        subjectEntityType: claim.subjectEntityType,
        subjectEntityId: claim.subjectEntityId,
        subjectTitle: entityDisplayName(subject),
        predicate: claim.predicate,
        valueText: claimValueText(claim.objectValue),
        sourceTitle: source?.title ?? claim.sourceId,
        sourceType: source?.type ?? "internal_note",
        reviewStatus: claim.reviewStatus,
        reviewByDate: claim.reviewByDate,
        overdue: isReviewDue(claim.reviewByDate),
        confidence: claim.confidence,
        reviewerId: claim.reviewerId,
        isDemo: claim.isDemo,
      };
    }),
  );

  // Stats: pending by state, due this week, overdue.
  const pendingByState = TRACKED_STATES.map((state) => ({
    state,
    count: claims.items.filter((claim) => claim.reviewStatus === state).length,
  }));
  const dueThisWeek = claims.items.filter((claim) => {
    const days = daysUntilReviewDue(claim.reviewByDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const overdueCount = claims.items.filter((claim) => isReviewDue(claim.reviewByDate)).length;

  // Completed reviews (audit trail) with claim context.
  const claimById = new Map(claims.items.map((claim) => [claim.id, claim]));
  const completedReviews = await Promise.all(
    reviews.items.map(async (review) => {
      const claim = claimById.get(review.claimId);
      const subject = claim
        ? await repo.getById(claim.subjectEntityType, claim.subjectEntityId)
        : null;
      return {
        id: review.id,
        claimLabel: claim
          ? `${humanize(claim.predicate)} — ${entityDisplayName(subject)}`
          : review.claimId,
        fromState: review.fromState,
        toState: review.toState,
        comment: review.comment,
        reviewerId: review.reviewerId,
        reviewedAt: review.reviewedAt,
      };
    }),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Evidence review queue
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Claims waiting for structural validation or analyst review, and records past their
          review-by date.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Demo mode: you are acting as the tenant owner (user_demo_owner) — all review actions are
        permitted and recorded under that identity.
      </p>

      {/* Stats header */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {pendingByState.map(({ state, count }) => (
          <Card key={state}>
            <CardContent className="p-3">
              <EvidenceStateBadge state={state} />
              <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{count}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-3">
            <span className="text-xs font-medium text-slate-500">Due this week</span>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">
              {dueThisWeek}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs font-medium text-red-600">Overdue</span>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-red-600">
              {overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <ReviewQueue rows={queueRows} />

      {/* Completed reviews */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Completed reviews</CardTitle>
          <CardDescription className="text-xs">
            Review audit trail, most recent first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedReviews.length === 0 ? (
            <p className="text-sm text-slate-500">No reviews recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim</TableHead>
                  <TableHead>Transition</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Reviewed at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="max-w-72">
                      <span className="block truncate text-sm text-slate-800">
                        {review.claimLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <EvidenceStateBadge state={review.fromState} />
                        <span aria-hidden="true">→</span>
                        <EvidenceStateBadge state={review.toState} />
                      </span>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <span className="block truncate text-xs text-slate-600">
                        {review.comment ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {review.reviewerId}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {formatDateTime(review.reviewedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400">
        Snapshot generated {formatDateTime(new Date().toISOString())}.
      </p>
    </div>
  );
}
