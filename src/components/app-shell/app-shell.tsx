"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { DataModeBadge } from "@/components/data-mode-badge";
import { QuickSearch } from "@/components/search/quick-search";
import { cn } from "@/lib/utils";
import type { DataBackend } from "@/lib/env";

import { navSections } from "./nav";

type AppShellProps = {
  children: ReactNode;
  backend: DataBackend;
};

export function AppShell({ children, backend }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-navy-900 text-navy-100 transition-[width] duration-200 lg:flex",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        <SidebarNav pathname={pathname} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/60"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-900 text-navy-100 shadow-xl">
            <SidebarNav
              pathname={pathname}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <div className="ml-1 flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Life Science Nexus
            </span>
            <DataModeBadge mode={backend} />
          </div>

          <div className="mx-4 hidden min-w-0 max-w-xl flex-1 md:block">
            <QuickSearch />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">
              Industrial Microbiology · Vietnam
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700"
              aria-label="Demo analyst account"
              title="Demo analyst"
            >
              DA
            </span>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({
  pathname,
  collapsed,
  onClose,
}: {
  pathname: string;
  collapsed: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-navy-800 px-4">
        <FlaskConical
          className="h-5 w-5 shrink-0 text-teal-400"
          aria-hidden="true"
        />
        {!collapsed ? (
          <span className="truncate text-sm font-semibold tracking-wide">
            Nexus
          </span>
        ) : null}
        {onClose ? (
          <button
            type="button"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-navy-200 hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 overflow-y-auto px-2 py-3"
      >
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {collapsed ? (
              <div
                className="mx-2 mb-1 border-t border-navy-800"
                aria-hidden="true"
              />
            ) : (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                        isActive && "bg-navy-800 text-white",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {!collapsed ? item.title : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
