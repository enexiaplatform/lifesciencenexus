import { Globe2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Visibility } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Canonical graph vs tenant-private overlay (canonical visibility variant). */
export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: Visibility;
  className?: string;
}) {
  if (visibility === "tenant_private") {
    return (
      <Badge
        variant="visibility"
        visibility="tenant_private"
        className={cn("whitespace-nowrap", className)}
      >
        <Lock className="h-3 w-3" aria-hidden="true" />
        Tenant private
      </Badge>
    );
  }
  return (
    <Badge
      variant="visibility"
      visibility="canonical"
      className={cn("whitespace-nowrap", className)}
    >
      <Globe2 className="h-3 w-3" aria-hidden="true" />
      Canonical
    </Badge>
  );
}

/** Synthetic demo-data marker; renders nothing for real records. */
export function IsDemoBadge({
  isDemo,
  className,
}: {
  isDemo: boolean;
  className?: string;
}) {
  if (!isDemo) return null;
  return (
    <Badge variant="demo" className={cn("whitespace-nowrap", className)}>
      Demo
    </Badge>
  );
}
