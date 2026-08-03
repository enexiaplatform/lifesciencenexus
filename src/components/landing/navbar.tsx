"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/enexiaplatform/lifesciencenexus";

const SECTION_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#evidence", label: "Evidence" },
  { href: "#ecosystem", label: "Ecosystem" },
] as const;

const linkClasses =
  "rounded-md px-2 py-1 text-sm text-slate-600 transition-colors duration-120 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2";

/**
 * Landing page chrome: sticky navbar with section anchors, GitHub link, and
 * the demo-workspace CTA. Collapses to an accessible disclosure menu on
 * small viewports.
 */
export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <nav
        aria-label="Landing"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Wordmark href="/" size={28} />

        <div className="hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={linkClasses}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(linkClasses, "inline-flex items-center gap-1")}
          >
            GitHub
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "sm" }), "h-9 px-4 text-sm")}
          >
            Open demo workspace
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md text-slate-700 transition-colors duration-120 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2 md:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {open ? (
        <div
          id="landing-mobile-menu"
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(linkClasses, "px-3 py-2")}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(linkClasses, "inline-flex items-center gap-1 px-3 py-2")}
            >
              GitHub
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "sm" }), "mt-2 h-10 text-sm")}
              onClick={() => setOpen(false)}
            >
              Open demo workspace
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
