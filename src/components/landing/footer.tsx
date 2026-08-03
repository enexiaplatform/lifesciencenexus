import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

const GITHUB_URL = "https://github.com/enexiaplatform/lifesciencenexus";
const ATLAS_URL = "https://bio-wiki-pro-claude.vercel.app/";
const MEMOIRE_URL = "https://memoire-blush-eta.vercel.app/";

const linkClasses =
  "rounded-sm text-sm text-nexus-300 transition-colors duration-120 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-950";

const COLUMNS: Array<{
  title: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
}> = [
  {
    title: "Product",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/search", label: "Search" },
      { href: "/products", label: "Products" },
      { href: "/signals", label: "Signals" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: GITHUB_URL, label: "GitHub", external: true },
      {
        href: `${GITHUB_URL}/blob/main/docs/ARCHITECTURE.md`,
        label: "Architecture",
        external: true,
      },
      {
        href: `${GITHUB_URL}/blob/main/docs/DATA_MODEL.md`,
        label: "Data model",
        external: true,
      },
      {
        href: `${GITHUB_URL}/blob/main/docs/DESIGN_SYSTEM.md`,
        label: "Design system",
        external: true,
      },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      { href: ATLAS_URL, label: "Atlas", external: true },
      { href: MEMOIRE_URL, label: "Memoire", external: true },
      {
        href: `${GITHUB_URL}/blob/main/docs/ECOSYSTEM_BOUNDARIES.md`,
        label: "Boundaries",
        external: true,
      },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-nexus-950">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Wordmark href="/" size={26} className="text-white" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-nexus-300">
              Industry &amp; product intelligence graph for life-science
              markets. Initial wedge: industrial microbiology in Vietnam.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-nexus-400">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClasses}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={linkClasses}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-nexus-800 pt-6 text-xs text-nexus-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Enexia Platform</p>
          <p>The demo workspace runs on synthetic data, labeled Demo.</p>
        </div>
      </div>
    </footer>
  );
}
