import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Exports" };

export default function ExportsPage() {
  return (
    <ModulePlaceholder
      title="Exports"
      description="Export entities, evidence, and analysis results to CSV and spreadsheet formats."
      capabilities={["Exports for any filtered entity set", "CSV and XLSX output formats", "Export history and scheduled exports"]}
    />
  );
}
