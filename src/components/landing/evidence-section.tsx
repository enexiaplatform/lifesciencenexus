import { Badge, type EvidenceBadgeState } from "@/components/ui/badge";

const EVIDENCE_STATES: Array<{ state: EvidenceBadgeState; label: string }> = [
  { state: "unverified", label: "Unverified" },
  { state: "source_captured", label: "Source captured" },
  { state: "structurally_validated", label: "Structurally validated" },
  { state: "analyst_reviewed", label: "Analyst reviewed" },
  { state: "domain_expert_reviewed", label: "Domain expert reviewed" },
  { state: "superseded", label: "Superseded" },
  { state: "disputed", label: "Disputed" },
  { state: "expired", label: "Expired" },
];

const CONFIDENCE_DIMENSIONS = [
  { name: "Source authority", weight: "20%" },
  { name: "Entity match", weight: "15%" },
  { name: "Technical equivalence", weight: "15%" },
  { name: "Geographic relevance", weight: "15%" },
  { name: "Commercial relevance", weight: "15%" },
  { name: "Source recency", weight: "10%" },
  { name: "Extraction quality", weight: "10%" },
] as const;

const CHECKLIST = [
  "Where did this come from?",
  "When was it observed?",
  "Who reviewed it?",
] as const;

export function EvidenceSection() {
  return (
    <section
      id="evidence"
      aria-labelledby="evidence-heading"
      className="scroll-mt-20 border-b border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
          Evidence
        </p>
        <h2
          id="evidence-heading"
          className="mt-3 font-display text-display-lg font-semibold text-nexus-900"
        >
          Nothing is presented as fact without evidence
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Every canonical fact carries a source chip, an evidence state, and a
          confidence record. A review queue governs what reaches the shared
          graph.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900">
              Eight evidence states
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The review ladder runs from unverified to domain-expert reviewed;
              superseded, disputed, and expired fail every review bar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {EVIDENCE_STATES.map(({ state, label }) => (
                <Badge key={state} variant="evidence" state={state}>
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900">
              Seven confidence dimensions
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Confidence is recorded per dimension — collapsing it into one
              number is a presentation choice, not the record.
            </p>
            <ul className="mt-4 space-y-1.5">
              {CONFIDENCE_DIMENSIONS.map((dimension) => (
                <li
                  key={dimension.name}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-slate-700">{dimension.name}</span>
                  <span className="tnum font-mono text-xs text-slate-500">
                    {dimension.weight}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-nexus-800 bg-nexus-900 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white">
            The three questions every fact must answer
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {CHECKLIST.map((question) => (
              <li
                key={question}
                className="flex items-start gap-2 text-sm leading-6 text-nexus-200"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-spectral-400"
                />
                {question}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
