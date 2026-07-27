import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Cost per Test" };

export default function CostPerTestPage() {
  return (
    <ModulePlaceholder
      title="Cost per Test"
      description="Model the real cost per test for a product, including consumables and labor."
      capabilities={["Cost models with configurable assumptions", "Consumable breakdown per test", "Scenario comparison across products"]}
    />
  );
}
