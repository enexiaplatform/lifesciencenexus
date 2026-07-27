import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <ModulePlaceholder
      title="Search"
      description="Unified search across organizations, products, evidence, and research objects in the Nexus graph."
      capabilities={["Full-text and structured filters across all entity types", "Saved searches and shareable result sets", "Search across evidence, sources, and review status"]}
    />
  );
}
