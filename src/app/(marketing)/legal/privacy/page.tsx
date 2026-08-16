import type { Metadata } from "next";

import { LegalArticle } from "@/components/marketing/legal-article";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How Life Science Nexus handles personal data: a synthetic, labeled demo dataset, no analytics or tracking cookies, account data limited to email and session cookies when sign-in is enabled, and tenant data isolated by Postgres row-level security.",
  openGraph: {
    title: "Privacy notice · Life Science Nexus",
    description:
      "No tracking cookies, a synthetic demo dataset, and tenant data isolated by deny-by-default row-level security.",
  },
};

const TOC = [
  { id: "controller", label: "Who is responsible" },
  { id: "scope", label: "Scope of this notice" },
  { id: "demo-data", label: "The demo workspace and synthetic data" },
  { id: "data-we-process", label: "Data we process" },
  { id: "cookies", label: "Cookies and tracking" },
  { id: "isolation", label: "How tenant data is isolated" },
  { id: "subprocessors", label: "Subprocessors" },
  { id: "retention", label: "Retention" },
  { id: "your-rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
  { id: "changes", label: "Changes to this notice" },
] as const;

export default function PrivacyPage() {
  return (
    <LegalArticle
      title="Privacy notice"
      lastUpdated="2026-08-16"
      toc={TOC}
    >
      <section aria-labelledby="controller">
        <h2 id="controller">Who is responsible</h2>
        <p>
          Life Science Nexus is operated by Enexia Platform, which acts as the
          data controller for the personal data processed through this site
          and the workspace. Where Nexus is deployed for a customer
          organization, that organization is the controller of its tenant
          data and Enexia Platform acts as its processor.
        </p>
      </section>

      <section aria-labelledby="scope">
        <h2 id="scope">Scope of this notice</h2>
        <p>
          This notice covers the public marketing pages, the public demo
          workspace, and authenticated Nexus deployments. It describes what
          data is processed, why, and the technical measures that keep tenant
          data separated. It does not cover the sister products Atlas and
          Memoire, which are operated under their own terms.
        </p>
      </section>

      <section aria-labelledby="demo-data">
        <h2 id="demo-data">The demo workspace and synthetic data</h2>
        <p>
          The public demo workspace serves a synthetic dataset. Organizations,
          people, products, prices, and tenders in the demo are fictional;
          every demo record is flagged as demo data in the database and
          carries a Demo label wherever it appears in the interface. No real
          personal data is required to explore the demo, and nothing you do in
          the demo workspace touches a real tenant.
        </p>
      </section>

      <section aria-labelledby="data-we-process">
        <h2 id="data-we-process">Data we process</h2>
        <p>
          When sign-in is enabled (Supabase Auth), an account consists of your
          email address, a password hash managed by Supabase Auth (GoTrue),
          and session cookies. We do not receive or store your plaintext
          password.
        </p>
        <p>
          Inside an authenticated deployment, the workspace stores the market
          and tenant data your organization records: organizations, products,
          suppliers, observed prices, tenders, installed base, research notes,
          and the people and contacts your tenant chooses to enter. People and
          contact records are always tenant-private — they are never published
          to the shared canonical layer.
        </p>
        <p>
          The request-access form on this site asks for your name, work email,
          company, role, and a short message. This evaluation deployment does
          not store submissions in a CRM or leads database.
        </p>
      </section>

      <section aria-labelledby="cookies">
        <h2 id="cookies">Cookies and tracking</h2>
        <p>
          This site sets no analytics cookies and runs no third-party tracking
          scripts. When you sign in to a deployment, Supabase Auth sets
          session cookies that are strictly necessary to keep you
          authenticated; they are not used for advertising or analytics.
        </p>
      </section>

      <section aria-labelledby="isolation">
        <h2 id="isolation">How tenant data is isolated</h2>
        <p>
          Tenant separation is enforced in the database, not only in
          application code. Every table in a Nexus deployment is covered by
          Postgres row-level security policies that deny access by default:
          canonical reference data is readable by authenticated users,
          tenant-private records are readable only by members of that tenant,
          and review actions require the corresponding tenant role. The
          technical model is documented in the security model that ships with
          the product.
        </p>
      </section>

      <section aria-labelledby="subprocessors">
        <h2 id="subprocessors">Subprocessors</h2>
        <p>A Nexus deployment relies on two subprocessors:</p>
        <ul>
          <li>
            Supabase — hosts the Postgres database, authentication, and
            row-level security enforcement.
          </li>
          <li>
            Vercel — hosts and serves the application itself.
          </li>
        </ul>
        <p>
          No other third party receives tenant data. The demo workspace can
          also run without Supabase at all, against the in-repository
          synthetic dataset.
        </p>
      </section>

      <section aria-labelledby="retention">
        <h2 id="retention">Retention</h2>
        <p>
          Account data is kept for as long as the account is active.
          Tenant data is retained for the duration of the deployment
          agreement; when a deployment ends, tenant data is exported or
          deleted as the agreement specifies. Superseded and expired evidence
          records are kept as history inside the workspace — that retention is
          a product feature (the evidence model requires history), not an
          oversight.
        </p>
      </section>

      <section aria-labelledby="your-rights">
        <h2 id="your-rights">Your rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to access,
          correct, export, restrict, or delete your personal data, and to
          object to certain processing. Because people and contact records
          inside a deployment belong to the tenant that entered them, requests
          about those records should go to the organization that operates the
          tenant. Requests about your own account can be made to the operator
          of this deployment.
        </p>
      </section>

      <section aria-labelledby="contact">
        <h2 id="contact">Contact</h2>
        <p>
          For privacy questions or to exercise a data subject right, contact
          the operator of this deployment through the request-access form or
          the channel your organization agreed with the operator. If your
          request concerns tenant data, identify the organization whose
          tenant you are asking about so the request can be routed correctly.
        </p>
      </section>

      <section aria-labelledby="changes">
        <h2 id="changes">Changes to this notice</h2>
        <p>
          When this notice changes, the new version is published on this page
          with an updated date. Material changes are also called out in the
          product changelog.
        </p>
      </section>
    </LegalArticle>
  );
}
