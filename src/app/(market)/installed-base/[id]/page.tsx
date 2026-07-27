import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Installed asset details" };

export default async function InstalledAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Installed asset details"
      identifier={id}
      description="Single installed asset record with site, product, age, and supporting evidence."
      capabilities={["Asset configuration and install date", "Linked site, laboratory, and product", "Evidence and source documents for the record"]}
    />
  );
}
