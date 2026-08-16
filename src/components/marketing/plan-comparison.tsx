import { Check, Minus } from "lucide-react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TierKey = "demo" | "professional" | "enterprise";

interface ComparisonRow {
  feature: string;
  demo: boolean;
  professional: boolean;
  enterprise: boolean;
}

/**
 * Rows only list capabilities that exist in this repository today
 * (see docs/BUILD_STATUS.md, phases 2–7).
 */
const ROWS: readonly ComparisonRow[] = [
  {
    feature: "Market graph: organizations, sites, laboratories, people, suppliers, tenders, installed base",
    demo: true,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Product catalog: products, SKUs, brands, applications, methods, standards, organisms",
    demo: true,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Intelligence: equivalence scoring, spec comparison, cost-per-test, price intelligence, signals, matching",
    demo: true,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Evidence model with eight states and publish review queue",
    demo: true,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Research workspace: entities, notes, findings, export",
    demo: true,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Data Ops: import wizard, export center, data-quality dashboard, entity resolution",
    demo: true,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Synthetic demo dataset, labeled Demo throughout",
    demo: true,
    professional: false,
    enterprise: false,
  },
  {
    feature: "Your own tenant data (tenant-private overlay, isolated by Postgres RLS)",
    demo: false,
    professional: true,
    enterprise: true,
  },
  {
    feature: "API v1 with published openapi.json",
    demo: false,
    professional: true,
    enterprise: true,
  },
  {
    feature: "Multi-tenant administration",
    demo: false,
    professional: false,
    enterprise: true,
  },
  {
    feature: "SSO for workspace sign-in",
    demo: false,
    professional: false,
    enterprise: true,
  },
  {
    feature: "Data-steward SLA and onboarding support",
    demo: false,
    professional: false,
    enterprise: true,
  },
  {
    feature: "Atlas and Memoire ecosystem integrations",
    demo: false,
    professional: false,
    enterprise: true,
  },
];

function TierMark({ included, tier }: { included: boolean; tier: string }) {
  if (included) {
    return (
      <>
        <Check
          className="mx-auto size-4 text-teal-700"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="sr-only">Included in {tier}</span>
      </>
    );
  }
  return (
    <>
      <Minus className="mx-auto size-4 text-slate-300" aria-hidden="true" />
      <span className="sr-only">Not included in {tier}</span>
    </>
  );
}

/**
 * Feature comparison across the three plans. Semantic table with scoped
 * header cells; check/minus marks carry text alternatives.
 */
export function PlanComparison() {
  const tiers: Array<{ key: TierKey; label: string }> = [
    { key: "demo", label: "Demo" },
    { key: "professional", label: "Professional" },
    { key: "enterprise", label: "Enterprise" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
      <Table>
        <TableCaption>
          Feature availability by plan. Every row reflects functionality that
          exists in the product today.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            {tiers.map((tier) => (
              <TableHead key={tier.key} className="text-center">
                {tier.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.feature}>
              <TableCell className="text-sm text-slate-700">
                {row.feature}
              </TableCell>
              {tiers.map((tier) => (
                <TableCell key={tier.key} className="text-center">
                  <TierMark included={row[tier.key]} tier={tier.label} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
