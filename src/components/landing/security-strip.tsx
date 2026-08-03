import { Database, FlaskConical, ShieldCheck, Users } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Row-level security",
    body: "Multi-tenancy enforced by Postgres RLS policies, not application checks alone.",
  },
  {
    icon: Users,
    title: "Tenant-private by default",
    body: "People and price observations stay inside the tenant unless reviewed into the canonical layer.",
  },
  {
    icon: Database,
    title: "Demo isolation",
    body: "The demo workspace is a separate, isolated dataset — nothing you explore touches a real tenant.",
  },
  {
    icon: FlaskConical,
    title: "Synthetic data, labeled",
    body: "Demo records are synthetic and carry a Demo label wherever they appear.",
  },
] as const;

export function SecurityStrip() {
  return (
    <section
      aria-labelledby="security-heading"
      className="border-b border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2
          id="security-heading"
          className="font-display text-display-md font-semibold text-nexus-900"
        >
          Tenancy and data governance
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <item.icon
                className="mt-0.5 size-5 shrink-0 text-nexus-500"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
