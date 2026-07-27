import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Organizations" };

export default function OrganizationsPage() {
  return (
    <ModulePlaceholder
      title="Organizations"
      description="Companies, hospitals, laboratories, distributors, and public bodies that buy, sell, or use life science products."
      capabilities={["Organization profiles with roles, locations, and relationships", "Link sites, laboratories, and people to parent organizations", "Track interactions, tenders, and installed base per organization"]}
    />
  );
}
