import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Site details" };

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Site details"
      identifier={id}
      description="A physical location belonging to an organization, such as a plant, campus, or branch."
      capabilities={["Address, geo, and operational attributes", "Laboratories and assets located at the site", "Evidence and sources captured for this site"]}
    />
  );
}
