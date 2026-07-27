import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Entity Resolution" };

export default function EntityResolutionPage() {
  return (
    <ModulePlaceholder
      title="Entity Resolution"
      description="Administrative workspace for duplicates, merges, and canonical entity management."
      capabilities={["Duplicate detection across entity types", "Merge and split with full audit trail", "Canonical record management"]}
    />
  );
}
