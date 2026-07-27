import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Research project details" };

export default async function ResearchProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModulePlaceholder
      title="Research project details"
      identifier={id}
      description="Single research project with its questions, sources, evidence, and findings."
      capabilities={["Research questions and scope", "Collected sources and extracted evidence", "Findings log and review status"]}
    />
  );
}
