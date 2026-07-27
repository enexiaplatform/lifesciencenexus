import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Signals" };

export default function SignalsPage() {
  return (
    <ModulePlaceholder
      title="Signals"
      description="Detected market signals such as launches, recalls, tender spikes, and price moves."
      capabilities={["Signal feed with severity and type", "Underlying evidence per signal", "Signal triage and follow-up workflow"]}
    />
  );
}
