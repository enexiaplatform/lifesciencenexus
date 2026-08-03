import { FileSpreadsheet, Hand, SearchX } from "lucide-react";

const PROBLEMS = [
  {
    icon: FileSpreadsheet,
    title: "Fragmented product data",
    body: "Catalogues, distributor spreadsheets, and tender documents each hold a piece of the market. None of them agree, and none of them connect.",
  },
  {
    icon: Hand,
    title: "Equivalence worked out by hand",
    body: "Cross-referencing formulations, intended uses, and method compatibility — and costing per test — is manual work, repeated for every account.",
  },
  {
    icon: SearchX,
    title: "No provenance on market facts",
    body: "A price hearsay, an installed-base claim, a supplier relationship — recorded without source, date, or review status, they cannot be checked later.",
  },
] as const;

export function ProblemStrip() {
  return (
    <section aria-labelledby="problem-heading" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2
          id="problem-heading"
          className="font-display text-display-lg font-semibold text-nexus-900"
        >
          Market knowledge lives in spreadsheets
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Commercial and technical teams in life-science markets answer
          structural questions — who makes what, who buys what, which standards
          apply, at what observed prices — from personal files and memory.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
            >
              <problem.icon
                className="size-5 text-nexus-500"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                {problem.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {problem.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
