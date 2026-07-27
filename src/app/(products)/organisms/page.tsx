import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Organisms" };

export default function OrganismsPage() {
  return (
    <ModulePlaceholder
      title="Organisms"
      description="Microorganisms relevant to testing, detection, and quality control workflows."
      capabilities={["Organism catalog with taxonomy", "Products and methods per organism", "Risk and regulatory context per organism"]}
    />
  );
}
