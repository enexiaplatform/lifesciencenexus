import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Sources" };

export default function SourcesPage() {
  return (
    <ModulePlaceholder
      title="Sources"
      description="Documents, websites, and files captured as raw material for evidence extraction."
      capabilities={["Source registry with type and provenance", "Capture status and processing state", "Extraction pipeline into evidence records"]}
    />
  );
}
