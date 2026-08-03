import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";

/**
 * Products-module empty state — thin wrapper over the canonical
 * `ui/empty-state` (Inbox icon, dashed panel, single action).
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <UiEmptyState
      icon={Inbox}
      title={title}
      description={description}
      action={action}
    />
  );
}
