import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Person details" };

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Person details"
      identifier={id}
      description="A contact or expert linked to organizations, laboratories, and research activity."
      capabilities={["Roles and affiliations across organizations", "Expertise tags and review activity", "Interaction and evidence history"]}
    />
  );
}
