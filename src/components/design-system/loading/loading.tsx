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

/** DashboardSkeleton — dashboard grid loading layout matching page structure. */
export function DashboardSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Card className="gap-0 rounded-lg border border-border py-0 shadow-none">
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="col-span-12 lg:col-span-6">
            <Card className="gap-0 rounded-lg border border-border py-0 shadow-none">
              <CardHeader className="border-b border-border/60 px-4 py-2.5">
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((__, row) => (
                  <Skeleton key={row} className="h-12 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="col-span-12 lg:col-span-6">
            <Card className="gap-0 rounded-lg border border-border py-0 shadow-none">
              <CardHeader className="border-b border-border/60 px-4 py-2.5">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="p-3">
                <Skeleton className="h-44 w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
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
