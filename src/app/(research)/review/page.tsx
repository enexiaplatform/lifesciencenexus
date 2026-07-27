import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata = { title: "Review Queue" };

export default function ReviewPage() {
  return (
    <ModulePlaceholder
      title="Review Queue"
      description="Human review workflow for evidence, matches, and extraction output."
      capabilities={["Queues by review type and priority", "Approve, reject, and dispute actions", "Reviewer assignment and audit log"]}
    />
  );
}
