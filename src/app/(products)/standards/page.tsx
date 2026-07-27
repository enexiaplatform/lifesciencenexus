import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Standards" };

export default function StandardsPage() {
  return (
    <ModulePlaceholder
      title="Standards"
      description="Regulatory and industry standards that govern products and methods."
      capabilities={["Standards catalog with issuing bodies", "Products and methods claiming compliance", "Change tracking across standard revisions"]}
    />
  );
}
