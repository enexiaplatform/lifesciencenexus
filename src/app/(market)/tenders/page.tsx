import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Tenders" };

export default function TendersPage() {
  return (
    <ModulePlaceholder
      title="Tenders"
      description="Public and private procurement tenders relevant to life science products."
      capabilities={["Tender ingestion, normalization, and deduplication", "Line-item extraction linking tenders to products", "Deadlines, buyers, and award tracking"]}
    />
  );
}
