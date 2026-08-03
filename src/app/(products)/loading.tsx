import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      {/* PageHeader proportions: display-font title + description */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}
