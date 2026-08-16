import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PricingTier {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: readonly string[];
  cta: { href: string; label: string };
  highlighted?: boolean;
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    name: "Demo",
    price: "Free",
    priceNote: "No signup",
    description:
      "The public demo workspace. Explore the full product surface against a synthetic, evidence-backed dataset.",
    features: [
      "Public demo workspace, no account required",
      "Synthetic dataset, labeled Demo throughout",
      "All six workflows explorable end to end",
      "Evidence model visible on every market fact",
    ],
    cta: { href: "/dashboard", label: "Open demo" },
  },
  {
    name: "Professional",
    price: "Custom",
    priceNote: "Per deployment",
    description:
      "A single-tenant deployment for one organization, on your own market data.",
    features: [
      "Single tenant on Supabase Postgres with RLS isolation",
      "All modules: Market, Products, Intelligence (equivalence, compare, cost-per-test, prices, signals)",
      "Research workspace and review queue",
      "Data Ops import/export (CSV, JSON, XLSX)",
      "API v1 with published openapi.json",
      "Evidence model with publish review workflow",
    ],
    cta: { href: "/contact", label: "Request access" },
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceNote: "Per deployment",
    description:
      "Everything in Professional, plus the controls larger organizations ask for.",
    features: [
      "Everything in Professional",
      "Multi-tenant administration",
      "SSO for workspace sign-in",
      "Data-steward SLA for the review queue",
      "Atlas and Memoire ecosystem integrations",
      "Onboarding support for your data stewards",
    ],
    cta: { href: "/contact", label: "Contact sales" },
  },
] as const;

/**
 * The three Nexus plans. Professional is visually marked as the most common
 * choice; the highlight is a border plus a labeled badge, never color alone.
 */
export function PricingTiers() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PRICING_TIERS.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "flex flex-col rounded-lg border bg-white p-5 shadow-xs sm:p-6",
            tier.highlighted
              ? "border-2 border-spectral-600"
              : "border-slate-200",
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-nexus-900">
              {tier.name}
            </h2>
            {tier.highlighted ? <Badge>Most popular</Badge> : null}
          </div>
          <p className="mt-3">
            <span className="font-display text-display-md font-semibold text-nexus-900">
              {tier.price}
            </span>{" "}
            <span className="text-xs text-slate-500">{tier.priceNote}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {tier.description}
          </p>
          <ul className="mt-4 flex-1 space-y-2">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm leading-6 text-slate-700"
              >
                <Check
                  className="mt-1 size-4 shrink-0 text-teal-700"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href={tier.cta.href}
            className={cn(
              buttonVariants({
                variant: tier.highlighted ? "default" : "outline",
              }),
              "mt-6",
            )}
          >
            {tier.cta.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      ))}
    </div>
  );
}
