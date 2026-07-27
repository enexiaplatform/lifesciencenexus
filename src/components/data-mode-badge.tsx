import { Badge } from "@/components/ui/badge";
import type { DataBackend } from "@/lib/env";

/**
 * Topbar badge showing the active data backend. In demo mode it renders the
 * "Demo workspace" badge; all demo data is synthetic and labeled.
 */
export function DataModeBadge({ mode }: { mode: DataBackend }) {
  if (mode === "demo") {
    return (
      <Badge variant="warning">
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        Demo workspace
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      <span
        className="h-1.5 w-1.5 rounded-full bg-teal-500"
        aria-hidden="true"
      />
      Supabase
    </Badge>
  );
}
