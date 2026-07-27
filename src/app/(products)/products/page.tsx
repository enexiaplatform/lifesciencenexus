import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <ModulePlaceholder
      title="Products"
      description="The canonical product catalog across manufacturers, brands, and categories."
      capabilities={["Product records with taxonomy and attributes", "SKUs, pack sizes, and configurations per product", "Links to applications, methods, standards, and organisms"]}
    />
  );
}
