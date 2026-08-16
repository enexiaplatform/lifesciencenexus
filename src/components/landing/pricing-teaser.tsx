import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Demo",
    line: "The public workspace on a synthetic, labeled dataset. Free, no signup.",
  },
  {
    name: "Professional",
    line: "Single-tenant deployment with every module and API v1. Custom pricing.",
  },
  {
    name: "Enterprise",
    line: "Multi-tenant admin, SSO, and a data-steward SLA. Custom pricing.",
  },
] as const;

/**
 * Compact pricing band on the landing page; full tiers and the comparison
 * table live on /pricing.
 */
export function PricingTeaser() {
  return (
    <section
      aria-labelledby="pricing-teaser-heading"
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2
              id="pricing-teaser-heading"
              className="font-display text-display-md font-semibold text-nexus-900"
            >
              Pricing, per deployment
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Start free on synthetic data. Move to your own tenant when you
              are ready.
            </p>
          </div>
          <Link
            href="/pricing"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Compare plans
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="rounded-lg border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                {tier.name}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {tier.line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
