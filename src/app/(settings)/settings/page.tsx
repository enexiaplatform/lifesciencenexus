import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="Workspace settings for the demo tenant, members, and preferences."
      capabilities={["Workspace profile and tenant configuration", "Members and roles", "Display and density preferences"]}
    />
  );
}
