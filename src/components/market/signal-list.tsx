import Link from "next/link";
import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { OpportunitySignal } from "@/lib/domain/types";

import { EmptyState } from "./empty-state";
import { formatConfidence, formatDate, humanize } from "./labels";

const relevanceVariant = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

/**
 * Derived-intelligence signals related to the entity being viewed. Signals
 * always explain themselves: reason + confidence + relevance + link to the
 * full Signals queue.
 */
export function SignalList({ signals }: { signals: OpportunitySignal[] }) {
  if (signals.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No signals reference this record"
        description="Signals are derived automatically when rules fire (replacement due, agreement expiry, coverage gaps, …)."
        action={{ label: "Open the signals queue", href: "/signals" }}
      />
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {signals.map((signal) => (
        <li key={signal.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-slate-800">{humanize(signal.type)}</p>
            <p className="text-xs text-slate-600">{signal.reason}</p>
            <p className="text-xs text-slate-500">
              Recommended: {signal.recommendedAction}
            </p>
            <p className="text-[11px] text-slate-400">
              Generated {formatDate(signal.generatedAt)} · confidence {formatConfidence(signal.confidence)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant={relevanceVariant[signal.commercialRelevance]}>{signal.commercialRelevance}</Badge>
            <Badge variant="outline">{humanize(signal.status)}</Badge>
          </div>
        </li>
      ))}
      <li className="pt-2">
        <Link href="/signals" className="text-xs font-medium text-spectral-600 hover:underline">
          View all signals
        </Link>
      </li>
    </ul>
  );
}
