import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Data Quality" };

export default function DataQualityPage() {
  return (
    <ModulePlaceholder
      title="Data Quality"
      description="Administrative dashboard for completeness, consistency, and freshness metrics."
      capabilities={["Completeness scores per entity type", "Consistency and duplicate checks", "Freshness tracking per source and entity"]}
    />
  );
}
