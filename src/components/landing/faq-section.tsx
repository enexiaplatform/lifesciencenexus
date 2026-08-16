import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "What data does the graph contain?",
    answer:
      "Organizations, sites, laboratories, people, manufacturers, brands, products, SKUs, applications, methods, standards, organisms, suppliers, observed prices, tenders, and installed base — connected as a graph. The demo dataset covers the global bioprocess portfolio (upstream, downstream, and QC) plus a deeper industrial-microbiology wedge in Vietnam.",
  },
  {
    question: "How does the evidence model work?",
    answer:
      "Every canonical fact links to a source record and carries one of eight evidence states, from unverified to domain-expert reviewed, with superseded, disputed, and expired as caution states. Confidence is recorded across seven dimensions, and a publish review queue governs what reaches the shared graph.",
  },
  {
    question: "Is the demo data real market data?",
    answer:
      "No. The demo workspace runs on a synthetic dataset: fictional organizations, people, products, and prices. Every demo record is flagged in the database and carries a Demo label wherever it appears, so synthetic data is never confused with real market facts.",
  },
  {
    question: "How is tenant data isolated?",
    answer:
      "In the database, not just in application code. Every table is covered by Postgres row-level security policies that deny by default: canonical data is readable by authenticated users, tenant-private records only by members of that tenant, and review actions only with the right tenant role.",
  },
  {
    question: "How do Atlas and Memoire connect?",
    answer:
      "Through versioned API contracts, not shared database access. Atlas reads Nexus market facts over a read-only API; Memoire receives one-way entity handoffs from Nexus. The contracts and boundaries are documented in the ecosystem section above.",
  },
  {
    question: "Why industrial microbiology in Vietnam as the first wedge?",
    answer:
      "It is bounded and graph-shaped — a countable set of plants, labs, suppliers, products, and tenders — and purchasing there is standards-driven, which a graph serves better than spreadsheets. Geography and vertical are configuration, not code, so the model transfers to the next market without re-architecture.",
  },
  {
    question: "How is pricing structured?",
    answer:
      "Per deployment, not per seat. The demo workspace is free; Professional and Enterprise deployments are priced per organization. See the pricing page for the full comparison.",
  },
] as const;

/**
 * Frequently asked questions. Native details/summary keeps the accordion
 * keyboard-accessible without JavaScript; the chevron rotation is
 * motion-safe and decorative.
 */
export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className="mt-3 font-display text-display-lg font-semibold text-nexus-900"
        >
          Questions buyers ask first
        </h2>
        <div className="mt-8 max-w-3xl divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-xs">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-sm font-semibold text-slate-900 transition-colors duration-120 hover:text-spectral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="size-4 shrink-0 text-slate-400 transition-transform duration-160 motion-safe:group-open:rotate-180"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-4 text-sm leading-6 text-slate-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
