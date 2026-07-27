import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Availability" };

export default function AvailabilityPage() {
  return (
    <ModulePlaceholder
      title="Availability"
      description="Where specific products and SKUs can actually be bought, by supplier and territory."
      capabilities={["Availability matrix by product, supplier, and country", "Stock and lead-time signals from sources", "Gaps where demand has no confirmed supply"]}
    />
  );
}
