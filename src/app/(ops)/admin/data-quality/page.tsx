import Link from "next/link";

import { getRepository } from "@/lib/data";
import { aggregateConfidence } from "@/lib/domain/confidence";
import { daysUntilReviewDue, freshnessBucket, isReviewDue } from "@/lib/domain/freshness";
import { EVIDENCE_STATES, type EvidenceState } from "@/lib/domain/types";
import { DomainEvidenceBadge } from "@/components/ops/domain-evidence-badge";
import { EvidenceStateChart } from "@/components/ops/evidence-state-chart";
import { entityHref } from "@/components/ops/links";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Data Quality" };
export const dynamic = "force-dynamic";

const SEVERITY_VARIANT = { high: "destructive", medium: "warning", low: "secondary" } as const;
const REVIEW_PENDING: EvidenceState[] = ["unverified", "source_captured", "structurally_validated"];

/**
 * /admin/data-quality — evidence coverage, freshness and the data_quality_issues
 * queue in one dashboard. Demo vs reviewed and canonical vs tenant-private
 * counters prove the layer separation on real data.
 */
export default async function DataQualityPage() {
  const repo = await getRepository();
  const now = new Date();

  const [claimsPaged, pricesPaged, issuesPaged, summary, orgs, products, skus, sources, projects, assets] =
    await Promise.all([
      repo.list("claim", { pageSize: 500 }),
      repo.list("price_observation", { pageSize: 500 }),
      repo.list("data_quality_issue", { pageSize: 100, sort: { field: "createdAt", direction: "desc" } }),
      repo.dashboardSummary(),
      repo.list("organization", { pageSize: 500 }),
      repo.list("product", { pageSize: 500 }),
      repo.list("sku", { pageSize: 500 }),
      repo.list("source", { pageSize: 500 }),
      repo.list("research_project", { pageSize: 500 }),
      repo.list("installed_asset", { pageSize: 500 }),
    ]);

  const claims = claimsPaged.items;
  const prices = pricesPaged.items;
  const issues = issuesPaged.items;

  // Records by evidence state (claims carry reviewStatus, prices evidenceState).
  const byState = new Map<EvidenceState, number>(EVIDENCE_STATES.map((state) => [state, 0]));
  for (const claim of claims) byState.set(claim.reviewStatus, (byState.get(claim.reviewStatus) ?? 0) + 1);
  for (const price of prices) byState.set(price.evidenceState, (byState.get(price.evidenceState) ?? 0) + 1);
  const chartData = EVIDENCE_STATES.map((state) => ({ state, count: byState.get(state) ?? 0 }));

  const claimsWithSources = claims.filter((claim) => claim.sourceId).length;
  const claimsWithSourcesPct = claims.length > 0 ? Math.round((claimsWithSources / claims.length) * 100) : 100;
  const reviewDueClaims = claims.filter((claim) => isReviewDue(claim.reviewByDate, now)).length;
  const stalePrices = prices.filter(
    (price) => freshnessBucket(price.observationDate, {}, now) === "stale",
  ).length;
  const syntheticPrices = prices.filter((price) => price.isSynthetic).length;
  const reviewedStates: EvidenceState[] = ["analyst_reviewed", "domain_expert_reviewed", "structurally_validated"];
  const reviewedPrices = prices.filter((price) => reviewedStates.includes(price.evidenceState)).length;

  // Demo-record counts per layer (separation proof).
  const pool = [
    ...claims,
    ...prices,
    ...orgs.items,
    ...products.items,
    ...skus.items,
    ...sources.items,
    ...projects.items,
    ...assets.items,
  ];
  const layers = {
    canonical: { demo: 0, nonDemo: 0 },
    tenant_private: { demo: 0, nonDemo: 0 },
  };
  for (const record of pool) {
    const layer = record.visibility === "tenant_private" ? layers.tenant_private : layers.canonical;
    if (record.isDemo) layer.demo += 1;
    else layer.nonDemo += 1;
  }

  // Freshness buckets.
  const priceBuckets = { fresh: 0, aging: 0, stale: 0 };
  for (const price of prices) priceBuckets[freshnessBucket(price.observationDate, {}, now)] += 1;
  const reviewBuckets = { overdue: 0, within30: 0, within90: 0, later: 0, unscheduled: 0 };
  for (const claim of claims) {
    if (isReviewDue(claim.reviewByDate, now)) reviewBuckets.overdue += 1;
    else {
      const days = daysUntilReviewDue(claim.reviewByDate, now);
      if (days === null) reviewBuckets.unscheduled += 1;
      else if (days <= 30) reviewBuckets.within30 += 1;
      else if (days <= 90) reviewBuckets.within90 += 1;
      else reviewBuckets.later += 1;
    }
  }

  // Important claims without review: pending review + aggregate confidence >= 0.6.
  const importantUnreviewed = claims
    .filter((claim) => REVIEW_PENDING.includes(claim.reviewStatus))
    .map((claim) => ({ claim, confidence: aggregateConfidence(claim.confidence) }))
    .filter(({ confidence }) => confidence >= 0.6)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        description={`Evidence coverage, freshness and open issues across the graph. ${summary.reviewQueueSize} claims sit in the review queue; ${summary.possibleDuplicates} duplicate pairs await triage.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Claims with sources" value={`${claimsWithSourcesPct}%`} detail={`${claimsWithSources}/${claims.length} claims cite a source`} />
        <MetricCard label="Review-due claims" value={String(reviewDueClaims)} detail="review-by date passed" tone={reviewDueClaims > 0 ? "warn" : "ok"} />
        <MetricCard label="Stale prices" value={String(stalePrices)} detail="older than 180 days" tone={stalePrices > 0 ? "warn" : "ok"} />
        <MetricCard label="Synthetic prices" value={String(syntheticPrices)} detail={`${reviewedPrices} price records reviewed`} tone={syntheticPrices > 0 ? "warn" : "ok"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Records by evidence state"
          description="Claims (review status) and price observations (evidence state) combined."
        >
          <EvidenceStateChart data={chartData} />
        </SectionCard>

        <SectionCard
          title="Layer separation"
          description="Demo vs real records per visibility layer — demo data never mixes."
          flush
        >
          <Table compact>
            <TableHeader>
              <TableRow>
                <TableHead>Layer</TableHead>
                <TableHead className="text-right">Demo</TableHead>
                <TableHead className="text-right">Real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><Badge variant="secondary">canonical</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{layers.canonical.demo}</TableCell>
                <TableCell className="text-right tabular-nums">{layers.canonical.nonDemo}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Badge variant="warning">tenant_private</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{layers.tenant_private.demo}</TableCell>
                <TableCell className="text-right tabular-nums">{layers.tenant_private.nonDemo}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Freshness"
          description="Price staleness and claim review schedule."
        >
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Price observations</p>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img"
                aria-label={`${priceBuckets.fresh} fresh, ${priceBuckets.aging} aging, ${priceBuckets.stale} stale prices`}>
                <div className="bg-success" style={{ width: pct(priceBuckets.fresh, prices.length) }} />
                <div className="bg-warning" style={{ width: pct(priceBuckets.aging, prices.length) }} />
                <div className="bg-danger" style={{ width: pct(priceBuckets.stale, prices.length) }} />
              </div>
              <p className="mt-1.5 text-xs tabular-nums text-slate-500">
                {priceBuckets.fresh} fresh (&le;90d) · {priceBuckets.aging} aging (91–180d) · {priceBuckets.stale} stale (&gt;180d)
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Claim review schedule</p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex justify-between"><span>Overdue</span><Badge variant={reviewBuckets.overdue > 0 ? "destructive" : "secondary"}>{reviewBuckets.overdue}</Badge></li>
                <li className="flex justify-between"><span>Due within 30 days</span><Badge variant="warning">{reviewBuckets.within30}</Badge></li>
                <li className="flex justify-between"><span>Due within 90 days</span><Badge variant="secondary">{reviewBuckets.within90}</Badge></li>
                <li className="flex justify-between"><span>Later</span><Badge variant="secondary">{reviewBuckets.later}</Badge></li>
                <li className="flex justify-between"><span>No review-by date</span><Badge variant="outline">{reviewBuckets.unscheduled}</Badge></li>
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Important claims without review"
          description="Pending review with aggregate confidence ≥ 0.6 — highest-value gaps first."
        >
          {importantUnreviewed.length === 0 ? (
            <p className="text-sm text-slate-500">No high-confidence claims awaiting review.</p>
          ) : (
            <ul className="space-y-2">
              {importantUnreviewed.map(({ claim, confidence }) => (
                <li key={claim.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={entityHref(claim.subjectEntityType, claim.subjectEntityId)}
                      className="font-medium text-accent hover:underline"
                    >
                      {claim.predicate}
                    </Link>
                    <span className="ml-2 text-xs text-slate-400">{claim.subjectEntityType}</span>
                    <div className="mt-0.5">
                      <DomainEvidenceBadge state={claim.reviewStatus} />
                    </div>
                  </div>
                  <Badge variant="outline" className="tabular-nums">{Math.round(confidence * 100)}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Data quality issues"
        description={`${issues.length} recorded issues, newest first.`}
        flush={issues.length > 0}
      >
        {issues.length === 0 ? (
          <p className="text-sm text-slate-500">No data quality issues recorded.</p>
        ) : (
          <Table compact>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Badge variant={SEVERITY_VARIANT[issue.severity]}>{issue.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{issue.kind}</TableCell>
                  <TableCell>
                    <Link
                      href={entityHref(issue.entityType, issue.entityId)}
                      className="text-accent hover:underline"
                    >
                      {issue.entityType}
                    </Link>
                    {issue.field ? <span className="text-xs text-slate-400">.{issue.field}</span> : null}
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-slate-600">{issue.description}</TableCell>
                  <TableCell><Badge variant="outline">{issue.status}</Badge></TableCell>
                  <TableCell className="text-xs tabular-nums text-slate-500">{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <StatCard
      label={label}
      value={
        tone === "neutral" ? (
          value
        ) : (
          <span className={tone === "warn" ? "text-warning-fg" : "text-success-fg"}>{value}</span>
        )
      }
      hint={detail}
    />
  );
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
