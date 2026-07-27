import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Brands" };

export default function BrandsPage() {
  return (
    <ModulePlaceholder
      title="Brands"
      description="Product brands and their ownership by manufacturers over time."
      capabilities={["Brand profiles and ownership history", "Products under each brand", "Brand-level market presence signals"]}
    />
  );
}
