import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Evidence" };

export default function EvidencePage() {
  return (
    <ModulePlaceholder
      title="Evidence"
      description="Atomic evidence records extracted from sources, each with a lifecycle status."
      capabilities={["Evidence records with typed claims", "Lifecycle states from unverified to expert-reviewed", "Links to entities, sources, and reviewers"]}
    />
  );
}
