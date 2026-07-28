import { Skeleton } from "@/components/ui/skeleton";

export default function ResearchWorkspaceLoading() {
  return (
    <div className="space-y-5" aria-label="Loading research workspace">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="xl:col-span-2">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
