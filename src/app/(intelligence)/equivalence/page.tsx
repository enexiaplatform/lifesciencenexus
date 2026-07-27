import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Equivalence" };

export default function EquivalencePage() {
  return (
    <ModulePlaceholder
      title="Equivalence"
      description="Claimed and verified equivalence relationships between products across manufacturers."
      capabilities={["Equivalence claims with confidence and evidence", "Side-by-side attribute comparison", "Review workflow for disputed claims"]}
    />
  );
}
