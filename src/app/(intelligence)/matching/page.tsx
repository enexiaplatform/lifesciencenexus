import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Matching" };

export default function MatchingPage() {
  return (
    <ModulePlaceholder
      title="Matching"
      description="Entity resolution workspace for matching incoming records to canonical entities."
      capabilities={["Candidate matching with similarity scoring", "Accept, reject, and merge decisions", "Match audit trail per decision"]}
    />
  );
}
