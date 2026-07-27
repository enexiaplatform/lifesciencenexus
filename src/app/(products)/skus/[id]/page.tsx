import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "SKU details" };

export default async function SkuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="SKU details"
      identifier={id}
      description="A single sellable unit of a product with pack size, catalog number, and identifiers."
      capabilities={["Catalog number and pack attributes", "Price and availability observations", "Mapping to manufacturer and brand"]}
    />
  );
}
