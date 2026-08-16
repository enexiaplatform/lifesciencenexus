import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-heading" className="bg-nexus-900">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="cta-heading"
          className="font-display text-display-lg font-semibold text-white"
        >
          Explore the demo workspace
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-nexus-200">
          Browse the seeded graph for the global bioprocess market —
          upstream, downstream, and QC: organizations, products, SKUs,
          standards, suppliers, observed prices, and tenders. No signup
          required.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-nexus-900 shadow-xs transition-colors duration-120 hover:bg-nexus-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-900 [&_svg]:size-4"
          >
            Open demo workspace
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-4 text-xs text-nexus-300">
          Demo data is synthetic and labeled Demo throughout the workspace.
        </p>
      </div>
    </section>
  );
}
