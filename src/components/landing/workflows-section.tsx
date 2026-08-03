import {
  Building2,
  Calculator,
  FileSearch,
  FileUp,
  Gavel,
  GitCompareArrows,
} from "lucide-react";
import Link from "next/link";

const WORKFLOWS = [
  {
    icon: FileSearch,
    name: "Research a product",
    outcome: "One page per product: SKUs, standards, suppliers, evidence.",
    href: "/products",
  },
  {
    icon: GitCompareArrows,
    name: "Compare equivalent SKUs",
    outcome: "Dimension-by-dimension equivalence with a stated score basis.",
    href: "/equivalence",
  },
  {
    icon: Calculator,
    name: "Cost per test",
    outcome: "Real running cost with every assumption shown.",
    href: "/cost-per-test",
  },
  {
    icon: Building2,
    name: "Map a market account",
    outcome: "Plants, labs, installed base, and current suppliers per account.",
    href: "/organizations",
  },
  {
    icon: Gavel,
    name: "Tender intelligence",
    outcome: "Tenders linked to the products and standards they reference.",
    href: "/tenders",
  },
  {
    icon: FileUp,
    name: "Spreadsheet ingestion",
    outcome: "Your files mapped into the graph with validation and preview.",
    href: "/imports",
  },
] as const;

export function WorkflowsSection() {
  return (
    <section
      aria-labelledby="workflows-heading"
      className="border-b border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="workflows-heading"
          className="font-display text-display-lg font-semibold text-nexus-900"
        >
          Six workflows in the demo workspace
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Each workflow runs on the same graph. Links open the demo workspace
          directly.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOWS.map((workflow) => (
            <Link
              key={workflow.name}
              href={workflow.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition-colors duration-160 hover:border-spectral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
            >
              <workflow.icon
                className="size-5 text-spectral-600"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-spectral-700">
                {workflow.name}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {workflow.outcome}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
