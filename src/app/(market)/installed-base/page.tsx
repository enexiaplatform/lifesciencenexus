import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Installed Base" };

export default function InstalledBasePage() {
  return (
    <ModulePlaceholder
      title="Installed Base"
      description="Instrument and system installations at customer sites, with age and configuration."
      capabilities={["Asset records by site, laboratory, and product", "Age profile and replacement opportunity scoring", "Evidence trail for each installation record"]}
    />
  );
}
