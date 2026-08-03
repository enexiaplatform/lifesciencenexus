import { cn } from "@/lib/utils";

const LAYERS = [
  {
    key: "A",
    name: "Canonical shared graph",
    body: "Verified public market facts — organizations, products, SKUs, standards, suppliers — with evidence references and review status.",
    accent: "border-spectral-600",
    chip: "bg-spectral-600",
  },
  {
    key: "B",
    name: "Tenant-private overlay",
    body: "Your quoted prices, field observations, and installed-base sightings, isolated per tenant and attached to canonical entities.",
    accent: "border-visibility-private",
    chip: "bg-visibility-private",
  },
  {
    key: "C",
    name: "Derived intelligence",
    body: "Equivalence scores, cost-per-test results, and market signals computed from A + B — always labeled as derived.",
    accent: "border-teal-600",
    chip: "bg-teal-600",
  },
  {
    key: "D",
    name: "Execution references",
    body: "References out to where work happens: Atlas for lab planning, Memoire for commercial execution.",
    accent: "border-nexus-500",
    chip: "bg-nexus-500",
  },
] as const;

export function LayersSection() {
  return (
    <section
      id="platform"
      aria-labelledby="layers-heading"
      className="scroll-mt-20 border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
          Platform
        </p>
        <h2
          id="layers-heading"
          className="mt-3 font-display text-display-lg font-semibold text-nexus-900"
        >
          Four layers, structurally separated
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Public truth, private overlay, derived intelligence, and execution
          references are kept apart in the data model — so a quoted price never
          masquerades as a market fact, and a derived score never masquerades
          as raw data.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LAYERS.map((layer, index) => (
            <div key={layer.key} className="relative">
              <div
                className={cn(
                  "h-full rounded-lg border border-slate-200 border-t-2 bg-white p-5 shadow-xs",
                  layer.accent,
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md font-display text-xs font-semibold text-white",
                      layer.chip,
                    )}
                  >
                    {layer.key}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {layer.name}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {layer.body}
                </p>
              </div>
              {index < LAYERS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 hidden h-px w-6 bg-slate-300 lg:block"
                />
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          <span className="font-medium text-slate-900">Review gate:</span>{" "}
          private data never becomes canonical without passing the publish
          review queue.
        </p>
      </div>
    </section>
  );
}
