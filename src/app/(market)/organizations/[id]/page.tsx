import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Organization details" };

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Organization details"
      identifier={id}
      description="Single organization profile with its sites, relationships, and linked market activity."
      capabilities={["Profile, roles, and hierarchy within the market graph", "Linked sites, laboratories, people, and contacts", "Tenders, installed base, and evidence attached to the organization"]}
    />
  );
}
