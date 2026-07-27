import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Manufacturers" };

export default function ManufacturersPage() {
  return (
    <ModulePlaceholder
      title="Manufacturers"
      description="Organizations that manufacture life science products, with brand and product portfolios."
      capabilities={["Manufacturer profiles and portfolio coverage", "Brands and products per manufacturer", "Market presence and supplier relationships"]}
    />
  );
}
