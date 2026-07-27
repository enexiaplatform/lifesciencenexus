import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <ModulePlaceholder
      title="Integrations"
      description="Connections to external systems such as Memoire and Atlas, plus API access."
      capabilities={["Memoire and Atlas integration endpoints", "API keys and webhook configuration", "Integration health and sync status"]}
    />
  );
}
