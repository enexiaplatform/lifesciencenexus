import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <ModulePlaceholder
      title="Suppliers"
      description="Distributors, resellers, and agents that supply products into target markets."
      capabilities={["Supplier profiles and territory coverage", "Brands and manufacturers represented", "Availability and price evidence per supplier"]}
    />
  );
}
