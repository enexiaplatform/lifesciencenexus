import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Boxes,
  Building2,
  ClipboardCheck,
  Database,
  FileText,
  Package,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EvidenceStateBadge } from "@/components/evidence/state-badge";
import { IsDemoBadge } from "@/components/evidence/meta-badges";
import { formatDate, formatMoney, relativeDays } from "@/components/evidence/format";
import {
  entityDisplayName,
  entityHref,
  entityTypeLabel,
  humanize,
} from "@/components/search/entity-routes";
import { getRepository } from "@/lib/data";
import { daysSince, daysUntil, freshnessBucket, isReviewDue } from "@/lib/domain/freshness";
import type { EntityType, EvidenceState, NexusEntity } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Dashboard" };

const PENDING_STATES: EvidenceState[] = [
  "unverified",
  "source_captured",
  "structurally_validated",
];

const QUICK_ACTIONS: Array<{ label: string; href: string }> = [
  { label: "Add source", href: "/sources?dialog=add" },
  { label: "Create organization", href: "/organizations?dialog=add" },
  { label: "Create product", href: "/products?dialog=add" },
  { label: "Record price", href: "/prices?dialog=add" },
  { label: "Add tender", href: "/tenders?dialog=add" },
  { label: "Record installed asset", href: "/installed-base?dialog=add" },
  { label: "Start comparison", href: "/compare" },
  { label: "Start cost model", href: "/cost-per-test" },
  { label: "Create research project", href: "/research?dialog=create" },
  { label: "Import data", href: "/imports" },
];

const RECENT_TYPES: EntityType[] = [
  "organization",
  "product",
  "sku",
  "source",
  "tender",
  "research_project",
];

function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

export default async function DashboardPage() {
  const repo = await getRepository();

  const [
    summary,
    projectsPage,
    claimsPage,
    pricesPage,
    sourcesPage,
    agreementsPage,
    tendersPage,
    assetsPage,
    assetModelsPage,
    equivalencesPage,
    skusPage,
  ] = await Promise.all([
    repo.dashboardSummary(),
    repo.list("research_project", {
      pageSize: 5,
      sort: { field: "updatedAt", direction: "desc" },
    }),
    repo.list("claim", { pageSize: 500 }),
    repo.list("price_observation", {
      pageSize: 500,
      sort: { field: "observationDate", direction: "desc" },
    }),
    repo.list("source", { pageSize: 500 }),
    repo.list("distribution_agreement", { pageSize: 200 }),
    repo.list("tender", { pageSize: 200 }),
    repo.list("installed_asset", { pageSize: 200 }),
    repo.list("asset_model", { pageSize: 200 }),
    repo.list("equivalence_record", { pageSize: 500 }),
    repo.list("sku", { pageSize: 500 }),
  ]);

  // Recently updated entities across the main families.
  const recentPages = await Promise.all(
    RECENT_TYPES.map((type) =>
      repo.list(type, { pageSize: 3, sort: { field: "updatedAt", direction: "desc" } }),
    ),
  );
  const recentEntities: Array<{ type: EntityType; entity: NexusEntity }> = recentPages
    .flatMap((page, index) =>
      page.items.map((entity) => ({ type: RECENT_TYPES[index], entity })),
    )
    .sort((a, b) => b.entity.updatedAt.localeCompare(a.entity.updatedAt))
    .slice(0, 8);

  const claims = claimsPage.items;
  const pendingClaims = claims.filter((claim) => PENDING_STATES.includes(claim.reviewStatus));
  const pendingByState = PENDING_STATES.map((state) => ({
    state,
    count: pendingClaims.filter((claim) => claim.reviewStatus === state).length,
  }));
  const reviewDueClaims = claims
    .filter((claim) => isReviewDue(claim.reviewByDate))
    .sort((a, b) => (a.reviewByDate ?? "").localeCompare(b.reviewByDate ?? ""))
    .slice(0, 5);
  const reviewDueSubjects = await Promise.all(
    reviewDueClaims.map(async (claim) => ({
      claim,
      subject: await repo.getById(claim.subjectEntityType, claim.subjectEntityId),
    })),
  );

  const skuNameById = new Map(skusPage.items.map((sku) => [sku.id, sku.name]));
  const stalePrices = pricesPage.items
    .filter((price) => freshnessBucket(price.observationDate) === "stale")
    .slice(0, 5);
  const newPrices7d = pricesPage.items.filter(
    (price) => daysSince(price.observationDate) <= 7,
  );

  // Evidence coverage: share of sources that back at least one claim.
  const claimedSourceIds = new Set(claims.map((claim) => claim.sourceId));
  const sourceCoverage =
    sourcesPage.items.length === 0
      ? 0
      : Math.round(
          (sourcesPage.items.filter((source) => claimedSourceIds.has(source.id)).length /
            sourcesPage.items.length) *
            100,
        );

  const orgNameCache = new Map<string, string>();
  async function orgName(id: string): Promise<string> {
    const cached = orgNameCache.get(id);
    if (cached) return cached;
    const org = await repo.getById("organization", id);
    const name = org?.name ?? id;
    orgNameCache.set(id, name);
    return name;
  }

  const expiringAgreements = await Promise.all(
    agreementsPage.items
      .filter((agreement) => {
        if (!agreement.validTo) return false;
        const days = daysUntil(agreement.validTo);
        return days >= 0 && days <= 90;
      })
      .map(async (agreement) => ({
        agreement,
        manufacturer: await orgName(agreement.manufacturerOrgId),
        distributor: await orgName(agreement.distributorOrgId),
        days: daysUntil(agreement.validTo!),
      })),
  );

  const upcomingSubmissions = tendersPage.items
    .filter((tender) => tender.submissionDeadline && daysUntil(tender.submissionDeadline) >= 0)
    .sort((a, b) => (a.submissionDeadline ?? "").localeCompare(b.submissionDeadline ?? ""));
  const upcomingRenewals = tendersPage.items
    .filter((tender) => {
      if (!tender.awardDate || !tender.contractPeriodMonths) return false;
      const renewal = addMonths(tender.awardDate, tender.contractPeriodMonths);
      const days = daysUntil(renewal);
      return days >= 0 && days <= 180;
    })
    .map((tender) => ({
      tender,
      renewalDate: addMonths(tender.awardDate!, tender.contractPeriodMonths!),
    }));

  const assetModelNameById = new Map(
    assetModelsPage.items.map((model) => [model.id, model.model]),
  );
  const nearingReplacement = assetsPage.items
    .filter((asset) => asset.expectedReplacementDate && daysUntil(asset.expectedReplacementDate) <= 180)
    .sort((a, b) =>
      (a.expectedReplacementDate ?? "").localeCompare(b.expectedReplacementDate ?? ""),
    );

  const coveredSkuIds = new Set<string>();
  for (const record of equivalencesPage.items) {
    coveredSkuIds.add(record.sourceSkuId);
    coveredSkuIds.add(record.candidateSkuId);
  }
  const equivalenceCoverage = {
    covered: Math.min(coveredSkuIds.size, skusPage.total),
    total: skusPage.total,
  };

  const counts = summary.counts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Industrial microbiology · Vietnam — workspace pulse across market, product and
            evidence data.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.href} asChild variant="outline" size="sm">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          label="Organizations"
          value={counts.organization ?? 0}
          href="/organizations"
        />
        <StatCard
          icon={<Package className="h-4 w-4" aria-hidden="true" />}
          label="Products"
          value={counts.product ?? 0}
          href="/products"
        />
        <StatCard
          icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
          label="SKUs"
          value={counts.sku ?? 0}
          href="/skus"
        />
        <StatCard
          icon={<Database className="h-4 w-4" aria-hidden="true" />}
          label="Sources"
          value={counts.source ?? 0}
          href="/sources"
          footnote={`${sourceCoverage}% with claims`}
        />
        <StatCard
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
          label="Review queue"
          value={summary.reviewQueueSize}
          href="/review"
          footnote="claims awaiting review"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Data requiring review */}
        <SectionCard
          title="Data requiring review"
          href="/review"
          description="Claims waiting on analyst action, by evidence state."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingByState.map(({ state, count }) => (
              <span key={state} className="inline-flex items-center gap-1.5">
                <EvidenceStateBadge state={state} />
                <span className="text-sm font-semibold tabular-nums text-slate-900">{count}</span>
              </span>
            ))}
          </div>
          {reviewDueSubjects.length > 0 ? (
            <ul className="space-y-1.5">
              {reviewDueSubjects.map(({ claim, subject }) => (
                <RowItem
                  key={claim.id}
                  href="/review"
                  title={`${humanize(claim.predicate)} — ${entityDisplayName(subject)}`}
                  meta={`Review by ${formatDate(claim.reviewByDate)}`}
                  metaTone="danger"
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No claims past their review-by date.</p>
          )}
        </SectionCard>

        {/* Evidence freshness */}
        <SectionCard
          title="Evidence freshness"
          href="/evidence"
          description="Stale prices, review-due claims and expiring agreements."
        >
          <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
            <FreshnessStat label="Stale prices" value={summary.freshness.stalePrices} />
            <FreshnessStat label="Review-due claims" value={summary.freshness.reviewDueClaims} />
            <FreshnessStat label="Expiring agreements" value={summary.freshness.expiringAgreements} />
          </dl>
          {stalePrices.length > 0 && (
            <>
              <Subheading>Stale price observations</Subheading>
              <ul className="space-y-1.5">
                {stalePrices.map((price) => (
                  <RowItem
                    key={price.id}
                    href="/prices"
                    title={skuNameById.get(price.skuId) ?? price.skuId}
                    meta={`${formatMoney(price.originalAmount, price.originalCurrency)} · ${daysSince(price.observationDate)}d old`}
                    metaTone="warning"
                  />
                ))}
              </ul>
            </>
          )}
          {expiringAgreements.length > 0 && (
            <>
              <Subheading>Expiring distribution agreements</Subheading>
              <ul className="space-y-1.5">
                {expiringAgreements.map(({ agreement, manufacturer, distributor, days }) => (
                  <RowItem
                    key={agreement.id}
                    href="/suppliers"
                    title={`${manufacturer} → ${distributor}`}
                    meta={`Expires ${formatDate(agreement.validTo)} (${relativeDays(days)})`}
                    metaTone="warning"
                  />
                ))}
              </ul>
            </>
          )}
          {stalePrices.length === 0 && expiringAgreements.length === 0 && (
            <p className="text-sm text-slate-500">Everything is fresh right now.</p>
          )}
        </SectionCard>

        {/* Recent research projects */}
        <SectionCard
          title="Recent research projects"
          href="/research"
          description="Latest analyst workspaces."
        >
          {projectsPage.items.length === 0 ? (
            <EmptyNextAction
              message="No research projects yet."
              actionLabel="Create research project"
              actionHref="/research?dialog=create"
            />
          ) : (
            <ul className="space-y-1.5">
              {projectsPage.items.map((project) => (
                <RowItem
                  key={project.id}
                  href={`/research/${project.id}`}
                  title={project.title}
                  meta={`${project.status} · updated ${formatDate(project.updatedAt)}`}
                  badge={<IsDemoBadge isDemo={project.isDemo} />}
                />
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recently updated entities */}
        <SectionCard
          title="Recently updated"
          href="/search"
          description="Latest changes across the graph."
        >
          <ul className="space-y-1.5">
            {recentEntities.map(({ type, entity }) => (
              <RowItem
                key={`${type}:${entity.id}`}
                href={entityHref(type, entity.id)}
                title={entityDisplayName(entity)}
                meta={`${entityTypeLabel(type)} · ${formatDate(entity.updatedAt)}`}
                badge={<IsDemoBadge isDemo={entity.isDemo} />}
              />
            ))}
          </ul>
        </SectionCard>

        {/* High-value opportunity signals */}
        <SectionCard
          title="High-value opportunity signals"
          href="/signals"
          description="Top new signals by commercial relevance."
          icon={<Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        >
          {summary.highValueSignals.length === 0 ? (
            <p className="text-sm text-slate-500">No new high-relevance signals.</p>
          ) : (
            <ul className="space-y-1.5">
              {summary.highValueSignals.map((signal) => (
                <RowItem
                  key={signal.id}
                  href="/signals"
                  title={humanize(signal.type)}
                  meta={signal.reason}
                  badge={<Badge variant="destructive">High</Badge>}
                />
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Tender deadlines */}
        <SectionCard
          title="Tender deadlines"
          href="/tenders"
          description="Upcoming submissions and expected renewals."
          icon={<FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        >
          {upcomingSubmissions.length === 0 && upcomingRenewals.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming tender deadlines.</p>
          ) : (
            <ul className="space-y-1.5">
              {upcomingSubmissions.map((tender) => (
                <RowItem
                  key={`sub-${tender.id}`}
                  href={`/tenders/${tender.id}`}
                  title={`${tender.code} — submission`}
                  meta={`Deadline ${formatDate(tender.submissionDeadline)} (${relativeDays(daysUntil(tender.submissionDeadline!))})`}
                  metaTone="danger"
                />
              ))}
              {upcomingRenewals.map(({ tender, renewalDate }) => (
                <RowItem
                  key={`ren-${tender.id}`}
                  href={`/tenders/${tender.id}`}
                  title={`${tender.code} — expected renewal`}
                  meta={`Around ${formatDate(renewalDate)} (${relativeDays(daysUntil(renewalDate))})`}
                  metaTone="warning"
                />
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Installed assets nearing replacement */}
        <SectionCard
          title="Installed assets nearing replacement"
          href="/installed-base"
          description="Replacement expected within 180 days (or overdue)."
          icon={<Boxes className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        >
          {nearingReplacement.length === 0 ? (
            <p className="text-sm text-slate-500">No assets nearing replacement.</p>
          ) : (
            <ul className="space-y-1.5">
              {nearingReplacement.map((asset) => {
                const days = daysUntil(asset.expectedReplacementDate!);
                return (
                  <RowItem
                    key={asset.id}
                    href={`/installed-base/${asset.id}`}
                    title={assetModelNameById.get(asset.assetModelId) ?? asset.assetModelId}
                    meta={`${formatDate(asset.expectedReplacementDate)} (${relativeDays(days)})`}
                    metaTone={days < 0 ? "danger" : "warning"}
                  />
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Small stat trio */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <MiniCard
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            title="Possible duplicates"
            value={summary.possibleDuplicates}
            href="/admin/entity-resolution"
            linkLabel="Open entity resolution"
          />
          <MiniCard
            title="New price observations (7d)"
            value={newPrices7d.length}
            href="/prices"
            linkLabel="Open prices"
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Product-equivalence coverage</CardTitle>
              <CardDescription className="text-xs">
                {equivalenceCoverage.covered} of {equivalenceCoverage.total} SKUs have equivalence
                records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={equivalenceCoverage.covered}
                aria-valuemin={0}
                aria-valuemax={equivalenceCoverage.total}
                aria-label="SKU equivalence coverage"
              >
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{
                    width: `${
                      equivalenceCoverage.total === 0
                        ? 0
                        : Math.round(
                            (equivalenceCoverage.covered / equivalenceCoverage.total) * 100,
                          )
                    }%`,
                  }}
                />
              </div>
              <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0">
                <Link href="/equivalence">
                  Open equivalence <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  footnote,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  footnote?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{footnote ?? " "}</span>
          <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
            <Link href={href}>
              Open <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  href,
  icon,
  children,
}: {
  title: string;
  description?: string;
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {icon}
            {title}
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link href={href}>
              View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MiniCard({
  icon,
  title,
  value,
  href,
  linkLabel,
}: {
  icon?: React.ReactNode;
  title: string;
  value: number;
  href: string;
  linkLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0">
          <Link href={href}>
            {linkLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RowItem({
  href,
  title,
  meta,
  metaTone,
  badge,
}: {
  href: string;
  title: string;
  meta?: string;
  metaTone?: "default" | "warning" | "danger";
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-slate-800">{title}</span>
          {meta && (
            <span
              className={
                metaTone === "danger"
                  ? "block truncate text-xs text-red-600"
                  : metaTone === "warning"
                    ? "block truncate text-xs text-amber-700"
                    : "block truncate text-xs text-slate-500"
              }
            >
              {meta}
            </span>
          )}
        </span>
        {badge}
      </Link>
    </li>
  );
}

function FreshnessStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 px-2 py-1.5">
      <dd className="text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
      <dt className="text-[11px] text-slate-500">{label}</dt>
    </div>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

function EmptyNextAction({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      <Button asChild size="sm" className="mt-2">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
