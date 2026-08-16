import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Shown in place of every auth form when Supabase env vars are not set:
 * this deployment runs the public demo without accounts.
 */
export function DemoDeploymentNotice() {
  return (
    <div>
      <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
        Demo deployment
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        This deployment runs the public demo without user accounts. The
        workspace is open — no sign-in required.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button asChild>
          <Link href="/dashboard">Open demo workspace</Link>
        </Button>
        <Link
          href="/"
          className="text-center text-sm font-medium text-spectral-600 underline-offset-4 hover:text-spectral-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectral-600 focus-visible:ring-offset-2"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
