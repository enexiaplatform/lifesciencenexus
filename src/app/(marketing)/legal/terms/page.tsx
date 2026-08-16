import type { Metadata } from "next";

import { LegalArticle } from "@/components/marketing/legal-article";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "Terms of service for Life Science Nexus: service description, the synthetic demo-data disclaimer, acceptable use, customer ownership of tenant data, warranty and liability terms, and Singapore governing law.",
  openGraph: {
    title: "Terms of service · Life Science Nexus",
    description:
      "The terms that govern the Nexus demo workspace and paid deployments — including the rule that demo data is synthetic and not for procurement decisions.",
  },
};

const TOC = [
  { id: "service", label: "The service" },
  { id: "demo-data", label: "Demo data is synthetic" },
  { id: "accounts", label: "Accounts and access" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "customer-data", label: "Customer data" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "derived-intelligence", label: "Derived intelligence" },
  { id: "warranty", label: "Warranty disclaimer" },
  { id: "liability", label: "Limitation of liability" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes", label: "Changes to these terms" },
] as const;

export default function TermsPage() {
  return (
    <LegalArticle title="Terms of service" lastUpdated="2026-08-16" toc={TOC}>
      <section aria-labelledby="service">
        <h2 id="service">The service</h2>
        <p>
          Life Science Nexus (&quot;Nexus&quot;) is an industry and product
          intelligence graph for life-science markets, operated by Enexia
          Platform. It connects organizations, products, SKUs, standards,
          suppliers, observed prices, tenders, and installed base into a
          queryable graph in which every canonical fact carries its source
          evidence and a review state. Nexus records market truth; it is not a
          CRM, not a lab-planning tool, and not a quoting or ordering system.
        </p>
      </section>

      <section aria-labelledby="demo-data">
        <h2 id="demo-data">Demo data is synthetic</h2>
        <p>
          The public demo workspace runs on a synthetic dataset. The
          organizations, people, products, prices, and tenders shown there are
          fictional, are flagged as demo data in the database, and carry a
          Demo label in the interface. Demo data exists to demonstrate the
          product&apos;s structure and workflows. Do not use demo data for
          procurement, pricing, compliance, or any other real decision.
        </p>
      </section>

      <section aria-labelledby="accounts">
        <h2 id="accounts">Accounts and access</h2>
        <p>
          The demo workspace requires no account. Access to an authenticated
          deployment is granted per organization under a separate order or
          agreement. You are responsible for the activity under your account
          and for keeping your credentials confidential. We may suspend access
          that compromises the service or other tenants.
        </p>
      </section>

      <section aria-labelledby="acceptable-use">
        <h2 id="acceptable-use">Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            enter personal data into a tenant without a lawful basis to do so;
          </li>
          <li>
            attempt to access another tenant&apos;s data or circumvent the
            row-level security policies that isolate tenants;
          </li>
          <li>
            scrape, bulk-export, or resell the canonical dataset except as
            your agreement permits;
          </li>
          <li>
            misrepresent derived scores or unreviewed claims as verified
            facts when you share them outside your organization;
          </li>
          <li>
            use the service to violate applicable law, including export
            control and sanctions rules.
          </li>
        </ul>
      </section>

      <section aria-labelledby="customer-data">
        <h2 id="customer-data">Customer data</h2>
        <p>
          You own the data your organization records in its tenant — quoted
          prices, field observations, contacts, notes, and research findings.
          Tenant-private data stays inside your tenant unless your reviewers
          explicitly publish it to the shared canonical layer through the
          review workflow. We process customer data only to operate the
          service and as your agreement instructs.
        </p>
      </section>

      <section aria-labelledby="intellectual-property">
        <h2 id="intellectual-property">Intellectual property</h2>
        <p>
          Enexia Platform owns the service itself: the software, the data
          model, the evidence methodology, the taxonomy, and the Nexus brand.
          The canonical reference layer — reviewed public market facts with
          their evidence records — is licensed to you for use inside your
          organization for the duration of your deployment, not sold. Nothing
          in these terms transfers ownership of your tenant data to us.
        </p>
      </section>

      <section aria-labelledby="derived-intelligence">
        <h2 id="derived-intelligence">Derived intelligence</h2>
        <p>
          Equivalence scores, cost-per-test results, price analytics, and
          market signals are computed outputs, and the product labels them as
          derived. They are decision support, not professional, regulatory, or
          procurement advice; the assumptions behind each output are shown in
          the product, and you remain responsible for how you use them.
        </p>
      </section>

      <section aria-labelledby="warranty">
        <h2 id="warranty">Warranty disclaimer</h2>
        <p>
          The demo workspace is provided as-is, with no warranty of any kind.
          Paid deployments carry the warranties stated in their order or
          agreement and no others. To the maximum extent permitted by law, we
          disclaim all implied warranties, including merchantability, fitness
          for a particular purpose, and non-infringement. Market facts carry
          the evidence state shown in the product; we do not warrant that
          third-party market information is complete, current, or error-free.
        </p>
      </section>

      <section aria-labelledby="liability">
        <h2 id="liability">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, neither party is liable for
          indirect, incidental, special, consequential, or punitive damages,
          or for lost profits, lost revenue, or lost data. Our aggregate
          liability arising out of these terms is capped at the fees you paid
          for the service in the twelve months before the event giving rise to
          the claim — and, for the free demo workspace, at zero. Nothing in
          this section limits liability that cannot be limited by law.
        </p>
      </section>

      <section aria-labelledby="termination">
        <h2 id="termination">Termination</h2>
        <p>
          You may stop using the demo workspace at any time. For paid
          deployments, either party may terminate as the order or agreement
          provides, and either party may terminate immediately for a material
          breach that is not cured after notice. On termination, your
          tenant&apos;s data is exported or deleted as the agreement
          specifies. Sections on intellectual property, warranty, liability,
          and governing law survive termination.
        </p>
      </section>

      <section aria-labelledby="governing-law">
        <h2 id="governing-law">Governing law</h2>
        <p>
          These terms are governed by the laws of Singapore, without regard to
          conflict-of-laws rules. The courts of Singapore have exclusive
          jurisdiction over disputes arising out of these terms, unless a
          separate agreement states otherwise.
        </p>
      </section>

      <section aria-labelledby="changes">
        <h2 id="changes">Changes to these terms</h2>
        <p>
          We may update these terms by publishing a new version on this page
          with an updated date. Continued use of the service after an update
          takes effect constitutes acceptance. If a change is material to a
          paid deployment, we notify the customer through the contact channel
          in its agreement.
        </p>
      </section>
    </LegalArticle>
  );
}
