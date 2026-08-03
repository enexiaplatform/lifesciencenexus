import type { Metadata } from "next";

import { CtaBand } from "@/components/landing/cta-band";
import { EcosystemSection } from "@/components/landing/ecosystem-section";
import { EvidenceSection } from "@/components/landing/evidence-section";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero";
import { IntelligenceSection } from "@/components/landing/intelligence-section";
import { LayersSection } from "@/components/landing/layers-section";
import { LandingNavbar } from "@/components/landing/navbar";
import { ProblemStrip } from "@/components/landing/problem-strip";
import { SecurityStrip } from "@/components/landing/security-strip";
import { WorkflowsSection } from "@/components/landing/workflows-section";

export const metadata: Metadata = {
  title: "Industry & product intelligence for life-science markets",
  description:
    "Life Science Nexus connects organizations, products, SKUs, standards, suppliers, observed prices, tenders, and installed base into one evidence-backed graph. Initial wedge: industrial microbiology in Vietnam.",
  openGraph: {
    title: "Life Science Nexus",
    description:
      "The intelligence graph for life-science markets — every fact carrying its evidence.",
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingNavbar />
      <main id="main-content" className="flex-1">
        <LandingHero />
        <ProblemStrip />
        <LayersSection />
        <WorkflowsSection />
        <IntelligenceSection />
        <EvidenceSection />
        <EcosystemSection />
        <SecurityStrip />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
