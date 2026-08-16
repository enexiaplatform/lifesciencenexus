import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Request access",
  description:
    "Request access to a Life Science Nexus deployment — single-tenant Professional or multi-tenant Enterprise — or open the public demo workspace with its synthetic, evidence-backed dataset.",
  openGraph: {
    title: "Request access · Life Science Nexus",
    description:
      "Talk to the team about a Nexus deployment, or explore the demo workspace first — no signup required.",
  },
};

const NEXT_STEPS = [
  {
    title: "You submit the form",
    body: "Tell us who you are and what you want to evaluate. No account is created.",
  },
  {
    title: "The team reviews the request",
    body: "Access requests for this deployment are reviewed by the team that operates it.",
  },
  {
    title: "You get a scoped workspace",
    body: "Professional and Enterprise deployments are provisioned per tenant, with the evidence model and review workflow enabled from day one.",
  },
] as const;

export default function ContactPage() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
          Contact
        </p>
        <h1 className="mt-3 font-display text-display-xl font-semibold text-nexus-900">
          Request access
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Nexus is deployed per organization. Tell us what you are evaluating
          and the team will follow up. Prefer to look first? The demo
          workspace runs on a synthetic, fully labeled dataset — no signup
          required.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <ContactForm />
          </div>

          <aside
            aria-labelledby="what-happens-next-heading"
            className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-5 sm:p-6"
          >
            <h2
              id="what-happens-next-heading"
              className="text-sm font-semibold text-slate-900"
            >
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              {NEXT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="tnum flex size-6 shrink-0 items-center justify-center rounded-full bg-spectral-50 font-mono text-xs font-medium text-spectral-700"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-0.5 text-sm leading-6 text-slate-600">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
              Not ready to talk?{" "}
              <Link
                href="/dashboard"
                className="rounded-sm font-medium text-spectral-600 underline-offset-4 transition-colors duration-120 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
              >
                Open the demo workspace instead
              </Link>
              .
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
