import type { ReactNode } from "react";

export interface LegalTocEntry {
  id: string;
  label: string;
}

/**
 * Shared layout for legal documents: a header with the document title and
 * last-updated date, an anchor table of contents, and the prose body.
 * Sections inside `children` carry ids matching the TOC entries.
 */
export function LegalArticle({
  title,
  lastUpdated,
  toc,
  children,
}: {
  title: string;
  lastUpdated: string;
  toc: readonly LegalTocEntry[];
  children: ReactNode;
}) {
  return (
    <article className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="max-w-prose">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-spectral-700">
            Legal
          </p>
          <h1 className="mt-3 font-display text-display-xl font-semibold text-nexus-900">
            {title}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Last updated:{" "}
            <time dateTime={lastUpdated} className="tnum">
              {lastUpdated}
            </time>
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <nav
            aria-label="Table of contents"
            className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-5"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              On this page
            </h2>
            <ol className="mt-3 space-y-2">
              {toc.map((entry, index) => (
                <li key={entry.id} className="flex gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="tnum font-mono text-xs leading-6 text-slate-400"
                  >
                    {index + 1}.
                  </span>
                  <a
                    href={`#${entry.id}`}
                    className="rounded-sm leading-6 text-slate-700 transition-colors duration-120 hover:text-spectral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
                  >
                    {entry.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-prose space-y-10 [&_h2]:scroll-mt-20 [&_h2]:font-display [&_h2]:text-display-sm [&_h2]:font-semibold [&_h2]:text-nexus-900 [&_li]:text-sm [&_li]:leading-6 [&_li]:text-slate-600 [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-slate-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}
