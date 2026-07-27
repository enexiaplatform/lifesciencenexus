import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Imports" };

export default function ImportsPage() {
  return (
    <ModulePlaceholder
      title="Imports"
      description="Bulk import of CSV and spreadsheet data into staging with mapping and validation."
      capabilities={["CSV and XLSX upload with column mapping", "Validation report before commit", "Import history and rollback"]}
    />
  );
}
