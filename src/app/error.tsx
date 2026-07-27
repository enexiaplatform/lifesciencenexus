"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Something went wrong
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        An unexpected error occurred
      </h1>
      <p className="max-w-md text-sm text-slate-600">
        {error.message || "The request could not be completed."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
