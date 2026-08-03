import { cn } from "@/lib/utils";

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-block rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] leading-4 text-slate-600">
      {children}
    </span>
  );
}

const ENGINES = [
  {
    name: "Equivalence scoring",
    body: "Eight weighted dimensions, renormalized over known evidence only. Unknown weight is reported separately, never scored as zero. Four classifications: exact, functional, closest alternative, not recommended.",
    chips: [
      "formula 25%",
      "intended use 20%",
      "method 15%",
      "organism 15%",
      "preparation 10%",
      "regulatory 5%",
      "format 5%",
      "availability 5%",
    ],
    note: "Decision support only — not a regulatory approval. The disclaimer ships with every result.",
  },
  {
    name: "Guided product matching",
    body: "Structured matching from a need — application, method, organism — to candidate products, with the criteria recorded alongside.",
    chips: ["application", "method", "organism"],
    note: null,
  },
  {
    name: "Specification comparison",
    body: "Side-by-side SKU specifications where a missing value renders as unknown — never silently as “not met”.",
    chips: ["unknown ≠ not met"],
    note: null,
  },
  {
    name: "Cost per test",
    body: "Running cost computed from pack format, tests per unit, and observed price — every assumption listed with the result.",
    chips: ["VND default", "currency = config"],
    note: null,
  },
  {
    name: "Price intelligence",
    body: "Observed prices normalized across currencies and units, each carrying its observation date so staleness is visible.",
    chips: ["normalized", "freshness-dated"],
    note: null,
  },
  {
    name: "Opportunity signals",
    body: "Market signals — launches, recalls, price moves, tender activity — each rendered with the evidence and reasoning behind it.",
    chips: ["explainable", "evidence-linked"],
    note: null,
  },
] as const;

export function IntelligenceSection() {
  return (
    <section
      id="intelligence"
      aria-labelledby="intelligence-heading"
      className="scroll-mt-20 border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
          Intelligence
        </p>
        <h2
          id="intelligence-heading"
          className="mt-3 font-display text-display-lg font-semibold text-nexus-900"
        >
          Derived intelligence, labeled as derived
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Every engine computes from the canonical graph plus the tenant
          overlay, shows its basis, and keeps its output marked as a
          derivation.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENGINES.map((engine) => (
            <div
              key={engine.name}
              className={cn(
                "flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-xs",
              )}
            >
              <h3 className="text-sm font-semibold text-slate-900">
                {engine.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {engine.body}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {engine.chips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </div>
              {engine.note ? (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                  {engine.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
