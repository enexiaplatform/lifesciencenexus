import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <ModulePlaceholder
      title="Compare"
      description="Side-by-side comparison of products, organizations, or tenders on shared attributes."
      capabilities={["Attribute matrix across selected entities", "Highlight differences and gaps", "Exportable comparison tables"]}
    />
  );
}
