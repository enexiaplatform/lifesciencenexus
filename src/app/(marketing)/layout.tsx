import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/footer";
import { LandingNavbar } from "@/components/landing/navbar";

/**
 * Shared chrome for the marketing surface (pricing, contact, legal):
 * the landing navbar and footer wrapped around a single main landmark.
 * The root `/` page composes its own chrome and is not part of this group.
 */
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingNavbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
