import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const ATLAS_URL = "https://bio-wiki-pro-claude.vercel.app/";
const MEMOIRE_URL = "https://memoire-blush-eta.vercel.app/";

const linkClasses =
  "mt-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-spectral-600 transition-colors duration-120 hover:text-spectral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2";

function FlowArrow({ direction, label }: { direction: "left" | "right"; label: string }) {
  const Icon = direction === "left" ? ArrowLeft : ArrowRight;
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2 py-4 lg:py-0">
      <Icon className="size-5 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
      <span className="whitespace-nowrap font-mono text-[11px] text-slate-500">
        {label}
      </span>
    </div>
  );
}

export function EcosystemSection() {
  return (
    <section
      id="ecosystem"
      aria-labelledby="ecosystem-heading"
      className="scroll-mt-20 border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
          Ecosystem
        </p>
        <h2
          id="ecosystem-heading"
          className="mt-3 font-display text-display-lg font-semibold text-nexus-900"
        >
          One factual substrate, three products
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Nexus is the shared market-fact layer. It does not design labs and it
          does not manage deals — documented contracts connect it to the
          products that do.
        </p>

        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* Atlas */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-display text-base font-semibold text-nexus-900">
              Atlas
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Quality-lab decision intelligence
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Answers <em>what should this lab be</em>. Vendor-neutral by
              contract; consumes Nexus market facts through a read-only API and
              never writes back.
            </p>
            <a href={ATLAS_URL} target="_blank" rel="noreferrer" className={linkClasses}>
              Visit Atlas
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <FlowArrow direction="left" label="read-only API" />

          {/* Nexus */}
          <div className="rounded-lg border-2 border-spectral-600 bg-spectral-50/50 p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <Logo size={20} title={null} />
              <h3 className="font-display text-base font-semibold text-nexus-900">
                Nexus
              </h3>
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Industry &amp; product intelligence graph
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Records <em>what is true in the market</em> — the canonical,
              evidence-backed substrate both sisters draw on, without becoming
              either.
            </p>
          </div>

          <FlowArrow direction="right" label="one-way handoff" />

          {/* Memoire */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-display text-base font-semibold text-nexus-900">
              Memoire
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Commercial control tower
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Answers <em>what do I do on my deals</em>. Single-user and
              private by design; receives entity handoffs from Nexus, one way.
            </p>
            <a href={MEMOIRE_URL} target="_blank" rel="noreferrer" className={linkClasses}>
              Visit Memoire
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
