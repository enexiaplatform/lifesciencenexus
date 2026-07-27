import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Laboratory details" };

export default async function LaboratoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Laboratory details"
      identifier={id}
      description="A laboratory entity with its discipline, accreditations, and testing activity."
      capabilities={["Discipline, accreditation, and capability profile", "Methods, standards, and organisms handled", "Installed instruments and product usage evidence"]}
    />
  );
}
