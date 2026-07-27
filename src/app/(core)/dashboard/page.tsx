import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  Columns2,
  Database,
  Download,
  FileCheck2,
  FileText,
  FolderKanban,
  GitCompareArrows,
  Package,
} from "lucide-react";

import { EvidenceBadge, type EvidenceState } from "@/components/evidence-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

const stats = [
  { label: "Organizations tracked", value: "128", delta: "+6 this week" },
  { label: "Products in graph", value: "342", delta: "+18 this week" },
  { label: "Evidence records", value: "1,204", delta: "+57 this week" },
  { label: "Open review items", value: "37", delta: "12 high priority" },
];

const recentResearch = [
  {
    title: "Q3 media fill supplier landscape",
    owner: "Demo analyst",
    updated: "2 hours ago",
  },
  {
    title: "Environmental monitoring in pharma cleanrooms",
    owner: "Demo analyst",
    updated: "Yesterday",
  },
  {
    title: "Sterility testing price benchmarks",
    owner: "Demo analyst",
    updated: "3 days ago",
  },
];

const reviewQueue: { label: string; count: number; state: EvidenceState }[] = [
  { label: "Price observations from tender award notices", count: 14, state: "unverified" },
  { label: "Equivalence claims extracted from distributor catalog", count: 9, state: "source-captured" },
  { label: "Installed base records pending field confirmation", count: 8, state: "validated" },
  { label: "Disputed organism-method mappings", count: 6, state: "disputed" },
];

const evidenceFreshness: { state: EvidenceState; share: number }[] = [
  { state: "validated", share: 62 },
  { state: "source-captured", share: 24 },
  { state: "unverified", share: 14 },
];

const signals = [
  {
    title: "Tender volume spike for sterility testing media",
    meta: "Public procurement · detected 5 hours ago",
    severity: "high",
  },
  {
    title: "New distributor listing three imported media brands",
    meta: "Supplier catalog · detected yesterday",
    severity: "medium",
  },
  {
    title: "Price drop on ready-to-use contact plates",
    meta: "Price watch · detected 2 days ago",
    severity: "low",
  },
] as const;

const quickActions = [
  { label: "Add source", href: "/sources", icon: Database },
  { label: "Create organization", href: "/organizations", icon: Building2 },
  { label: "Create product", href: "/products", icon: Package },
  { label: "Record price", href: "/prices", icon: GitCompareArrows },
  { label: "Add tender", href: "/tenders", icon: FileText },
  { label: "Record installed asset", href: "/installed-base", icon: Boxes },
  { label: "Start comparison", href: "/compare", icon: Columns2 },
  { label: "Start cost model", href: "/cost-per-test", icon: Calculator },
  { label: "Create research project", href: "/research", icon: FolderKanban },
  { label: "Import data", href: "/imports", icon: Download },
];

const severityVariant = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Intelligence overview for the industrial microbiology wedge. All
          figures below are static demo data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs">
                {stat.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stat.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban
                className="h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              Recent research
            </CardTitle>
            <CardDescription>
              Latest analyst project activity in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {recentResearch.map((item) => (
                <li
                  key={item.title}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">{item.owner}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {item.updated}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/research"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View all projects
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck
                className="h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              Data requiring review
            </CardTitle>
            <CardDescription>
              Evidence and records waiting in the review queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {reviewQueue.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.count} records
                    </p>
                  </div>
                  <EvidenceBadge state={item.state} />
                </li>
              ))}
            </ul>
            <Link
              href="/review"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Open review queue
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2
                className="h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              Evidence freshness
            </CardTitle>
            <CardDescription>
              Share of evidence records by lifecycle state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {evidenceFreshness.map((row) => (
              <div key={row.state} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <EvidenceBadge state={row.state} />
                  <span className="font-medium text-slate-600">
                    {row.share}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-navy-600"
                    style={{ width: `${row.share}%` }}
                  />
                </div>
              </div>
            ))}
            <Link
              href="/evidence"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Browse evidence
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
              High-value signals
            </CardTitle>
            <CardDescription>
              Recent market signals worth analyst attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {signals.map((signal) => (
                <li
                  key={signal.title}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {signal.title}
                    </p>
                    <p className="text-xs text-slate-500">{signal.meta}</p>
                  </div>
                  <Badge variant={severityVariant[signal.severity]}>
                    {signal.severity}
                  </Badge>
                </li>
              ))}
            </ul>
            <Link
              href="/signals"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View all signals
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>
            Jump into the most common capture and analysis workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition-colors hover:border-navy-300 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <action.icon
                  className="h-4 w-4 text-navy-600"
                  aria-hidden="true"
                />
                {action.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
