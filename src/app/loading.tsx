import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
