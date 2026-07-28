import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Prominent banner for surfaces dominated by tenant-private overlay data
 * (people, contacts, installed base). Makes the data boundary explicit so
 * private records are never mistaken for canonical shared-graph facts.
 */
export function TenantPrivateNotice({
  message = "This page shows tenant-private records. They are visible only inside this workspace and are never synced to the canonical shared graph.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900",
        className,
      )}
    >
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
