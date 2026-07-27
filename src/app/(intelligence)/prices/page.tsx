import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Prices" };

export default function PricesPage() {
  return (
    <ModulePlaceholder
      title="Prices"
      description="Observed price points for products and SKUs across suppliers, tenders, and time."
      capabilities={["Price observations with currency and date", "Price trends per product and market", "Source-linked evidence for every price"]}
    />
  );
}
