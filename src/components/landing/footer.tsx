import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

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
    title: "Portfolio",
    links: [
      { href: "/categories/cell_culture_media", label: "Upstream" },
      { href: "/categories/purification_chromatography", label: "Downstream" },
      { href: "/categories/sterility_testing_equipment", label: "QC" },
      { href: "/suppliers", label: "Suppliers" },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      { href: ATLAS_URL, label: "Atlas", external: true },
      { href: MEMOIRE_URL, label: "Memoire", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-nexus-950">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Wordmark href="/" size={26} className="text-white" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-nexus-300">
              Industry &amp; product intelligence graph for life-science
              markets. Global coverage: upstream, downstream, and QC.
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
          <p>Demo workspace — market data carries public source references.</p>
        </div>
      </div>
    </footer>
  );
}
