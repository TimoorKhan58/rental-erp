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

/**
 * DashboardSkeleton — OCC loading layout.
 * Mirrors the actual dashboard structure so the initial paint does not
 * reflow when live data arrives: hero → today (4) → 8/4 attention+quick actions
 * → business health (4) → inventory (3) → upcoming (3) → insights + notifications.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading dashboard">
      {/* Hero */}
      <div className="border-b border-border pb-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3.5 w-full max-w-lg" />
            <Skeleton className="h-5 w-28 rounded-md" />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Today (4 tiles) */}
      <SectionStripSkeleton tiles={4} lgSpan={3} />

      {/* Attention (8) + Quick actions (4) */}
      <div className="app-grid">
        <div className="min-w-0 col-span-1 sm:col-span-6 lg:col-span-8">
          <Card>
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="min-w-0 col-span-1 sm:col-span-6 lg:col-span-4">
          <Card>
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
            <CardContent className="space-y-1.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Business health (4 pulse tiles) */}
      <SectionStripSkeleton tiles={4} lgSpan={3} withHeader />

      {/* Inventory health (3 tiles) */}
      <SectionStripSkeleton tiles={3} lgSpan={4} withHeader />

      {/* Upcoming (3 tiles) */}
      <SectionStripSkeleton tiles={3} lgSpan={4} withHeader />
    </div>
  );
}

/** Internal strip helper for OCC skeletons. */
function SectionStripSkeleton({
  tiles,
  lgSpan,
  withHeader = false,
}: {
  tiles: number;
  lgSpan: 3 | 4;
  withHeader?: boolean;
}) {
  const spanClass =
    lgSpan === 3
      ? "[&>*]:sm:col-span-3 [&>*]:lg:col-span-3"
      : "[&>*]:sm:col-span-3 [&>*]:lg:col-span-4";
  return (
    <section>
      {withHeader ? (
        <div className="mb-2 space-y-1">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
      ) : (
        <div className="mb-2 space-y-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
      )}
      <div className={`app-grid ${spanClass}`}>
        {Array.from({ length: tiles }).map((_, index) => (
          <Card key={index} size="sm" className="gap-0 py-0">
            <CardContent className="space-y-1 p-3">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/** PageSkeleton — full page content loading layout. */
export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading page">
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
