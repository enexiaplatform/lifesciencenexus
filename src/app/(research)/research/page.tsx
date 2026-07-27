import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Research Projects" };

export default function ResearchPage() {
  return (
    <ModulePlaceholder
      title="Research Projects"
      description="Analyst research projects that organize questions, sources, and findings."
      capabilities={["Project workspaces with research questions", "Sources and evidence linked per project", "Findings and exportable summaries"]}
    />
  );
}
