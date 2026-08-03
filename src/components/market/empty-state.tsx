import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";

import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";

/**
 * Market-module empty state — thin wrapper over the canonical
 * `ui/empty-state`; keeps the `{ label, href }` action shorthand used across
 * the module's list pages.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <UiEmptyState
      icon={icon ?? Inbox}
      title={title}
      description={description}
      className={className}
      action={
        action ? (
          <Link
            href={action.href}
            className="text-sm font-medium text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
          >
            {action.label}
          </Link>
        ) : undefined
      }
    />
  );
}
