import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/enexiaplatform/lifesciencenexus";

/**
 * Abstract node-graph motif for the hero background. Decorative only.
 */
function GraphMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 400"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M80 320 L180 180 L320 240 L440 120 L540 200" />
        <path d="M180 180 L120 80 L300 60 L440 120" />
        <path d="M320 240 L300 60" />
      </g>
      <g fill="currentColor">
        <circle cx="80" cy="320" r="5" />
        <circle cx="180" cy="180" r="6" className="motion-safe:animate-pulse" />
        <circle cx="320" cy="240" r="5" />
        <circle cx="440" cy="120" r="6" />
        <circle cx="540" cy="200" r="5" />
        <circle cx="120" cy="80" r="4" />
        <circle cx="300" cy="60" r="5" />
      </g>
    </svg>
  );
}

/** A decorative pill that mimics the in-app evidence badges. */
function MockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-16 rounded-full border",
        className,
      )}
    />
  );
}

/**
 * Stylized, pure-CSS dashboard mock: sidebar, stat cards, dense table rows,
 * evidence badges. Entirely decorative — hidden from assistive tech.
 */
function DashboardMock() {
  const rows = [
    {
      badge: "border-evidence-reviewed-border bg-evidence-reviewed-bg",
      widths: ["w-24", "w-16", "w-12"],
    },
    {
      badge: "border-evidence-source-captured-border bg-evidence-source-captured-bg",
      widths: ["w-28", "w-14", "w-12"],
    },
    {
      badge: "border-evidence-validated-border bg-evidence-validated-bg",
      widths: ["w-20", "w-16", "w-10"],
    },
    {
      badge: "border-evidence-unverified-border bg-evidence-unverified-bg",
      widths: ["w-24", "w-12", "w-12"],
    },
    {
      badge: "border-evidence-reviewed-border bg-evidence-reviewed-bg",
      widths: ["w-16", "w-16", "w-10"],
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="ml-3 h-3 w-40 rounded bg-slate-200" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-40 shrink-0 flex-col gap-2 bg-nexus-900 p-4 sm:flex">
          <div className="mb-2 h-3 w-16 rounded bg-nexus-700" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2.5 rounded",
                i === 1 ? "w-24 bg-spectral-500" : "w-20 bg-nexus-700",
              )}
            />
          ))}
          <div className="mt-auto h-2.5 w-14 rounded bg-nexus-700" />
        </div>

        {/* Main panel */}
        <div className="flex-1 space-y-4 p-4 sm:p-5">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { accent: "bg-spectral-600", value: "w-10" },
              { accent: "bg-teal-600", value: "w-8" },
              { accent: "bg-nexus-500", value: "w-12" },
            ].map((card, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-xs"
              >
                <div className="h-2 w-14 rounded bg-slate-200" />
                <div className={cn("h-4 rounded", card.accent, card.value)} />
                <div className="h-2 w-10 rounded bg-slate-100" />
              </div>
            ))}
          </div>

          {/* Dense table */}
          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <span className="h-2 w-20 rounded bg-slate-300" />
              <span className="h-2 w-14 rounded bg-slate-300" />
              <span className="ml-auto h-2 w-16 rounded bg-slate-300" />
            </div>
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
              >
                <span className="size-2 rounded-full bg-spectral-500" />
                <span className={cn("h-2.5 rounded bg-slate-200", row.widths[0])} />
                <span className={cn("h-2.5 rounded bg-slate-100", row.widths[1])} />
                <span className={cn("hidden h-2.5 rounded bg-slate-100 sm:block", row.widths[2])} />
                <MockBadge className={cn("ml-auto", row.badge)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <GraphMotif className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[630px] text-spectral-200 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
              Life Science Nexus
            </p>
            <h1 className="mt-4 font-display text-display-xl font-semibold text-nexus-900 sm:text-5xl sm:leading-[3.25rem]">
              The intelligence graph for life-science markets.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Organizations, products, SKUs, standards, suppliers, observed
              prices, tenders, and installed base — connected in one graph,
              every fact carrying its evidence. Initial wedge: industrial
              microbiology in Vietnam, QC labs in pharma and food
              manufacturing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Open demo workspace
                <ArrowRight aria-hidden="true" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Explore the docs
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              The demo workspace runs without signup on synthetic,
              Demo-labeled data.
            </p>
          </div>

          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
