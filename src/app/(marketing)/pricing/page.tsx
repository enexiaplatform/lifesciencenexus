import type { Metadata } from "next";

import { PlanComparison } from "@/components/marketing/plan-comparison";
import { PricingTiers } from "@/components/marketing/pricing-tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Life Science Nexus pricing: a free public demo workspace on a synthetic dataset, plus Professional (single tenant) and Enterprise (multi-tenant, SSO, data-steward SLA) deployments priced per deployment.",
  openGraph: {
    title: "Pricing · Life Science Nexus",
    description:
      "Free demo workspace, or a per-deployment Professional or Enterprise plan — every plan carries the same evidence model.",
  },
};

export default function PricingPage() {
  return (
    <>
      <section
        aria-labelledby="pricing-heading"
        className="border-b border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
            Pricing
          </p>
          <h1
            id="pricing-heading"
            className="mt-3 font-display text-display-xl font-semibold text-nexus-900"
          >
            Priced per deployment, not per seat count
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Nexus is deployed per organization, with tenant data isolated by
            Postgres row-level security. Start with the free demo workspace —
            every market fact there is synthetic and labeled — then talk to us
            about a deployment on your own data.
          </p>
          <div className="mt-10">
            <PricingTiers />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="compare-plans-heading"
        className="border-b border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2
            id="compare-plans-heading"
            className="font-display text-display-lg font-semibold text-nexus-900"
          >
            Compare plans
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            All plans share the same evidence model: eight evidence states, a
            publish review queue, and a confidence record per fact. The
            difference is whose data the deployment serves and how it is
            operated.
          </p>
          <div className="mt-8">
            <PlanComparison />
          </div>
        </div>
      </section>
    </>
  );
}
