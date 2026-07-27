import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Product details" };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Product details"
      identifier={id}
      description="Single product profile with SKUs, positioning, and linked intelligence."
      capabilities={["Attributes, taxonomy, and documentation", "SKUs and pack configurations", "Prices, availability, equivalence, and evidence"]}
    />
  );
}
