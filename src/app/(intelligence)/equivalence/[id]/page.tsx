import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Equivalence claim details" };

export default async function EquivalenceClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Equivalence claim details"
      identifier={id}
      description="Single equivalence claim between two products with its evidence and status."
      capabilities={["Claim rationale and attribute mapping", "Evidence records and source documents", "Review history and dispute handling"]}
    />
  );
}
