import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <ModulePlaceholder
      title="Applications"
      description="Use cases and application areas that products are positioned for."
      capabilities={["Application taxonomy per market segment", "Products and methods per application", "Demand signals by application area"]}
    />
  );
}
