import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Methods" };

export default function MethodsPage() {
  return (
    <ModulePlaceholder
      title="Methods"
      description="Laboratory methods and workflows that products enable or comply with."
      capabilities={["Method catalog with steps and requirements", "Products and standards linked per method", "Adoption signals across laboratories"]}
    />
  );
}
