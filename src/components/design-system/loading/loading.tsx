import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** FormSkeleton — loading placeholder for form layouts. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

/** ListSkeleton — vertical list loading placeholder. */
export function ListSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** CardSkeleton — single card loading placeholder. */
export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

/** DashboardSkeleton — dashboard grid loading layout. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/** PageSkeleton — full page content loading layout. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <DashboardSkeleton />
    </div>
  );
}

export { SkeletonTable } from "@/components/loading/skeleton-table";
export { SkeletonCards } from "@/components/loading/skeleton-cards";
