import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ScreenshotFrame } from "@/components/landing/screenshot-frame";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
              every fact carrying its evidence. Global coverage of the
              bioprocess portfolio: upstream, downstream, and QC.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Open demo workspace
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-spectral-600 underline-offset-4 transition-colors duration-120 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
              >
                Request access
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              The demo workspace runs without signup; every market fact
              carries its source evidence.
            </p>
          </div>

          <ScreenshotFrame
            src="/screenshots/dashboard.png"
            videoSrc="/screenshots/demo.webm"
            alt="Nexus demo workspace — short walkthrough of the dashboard, equivalence workspace, and evidence claims"
            caption="nexus /dashboard"
            priority
          />
        </div>
      </div>
    </section>
  );
}
