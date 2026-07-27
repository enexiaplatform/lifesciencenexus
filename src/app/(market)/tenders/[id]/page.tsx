import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Tender details" };

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Tender details"
      identifier={id}
      description="Single tender record with line items, buyer, deadlines, and linked evidence."
      capabilities={["Tender metadata, buyer, and timeline", "Line items mapped to products and SKUs", "Source documents and extraction evidence"]}
    />
  );
}
