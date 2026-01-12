interface PlayersListSkeletonProps {
  viewMode: "table" | "grid" | "scouting";
  count?: number;
}

export function PlayersListSkeleton({ viewMode, count = 12 }: PlayersListSkeletonProps) {
  if (viewMode === "grid" || viewMode === "scouting") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="admin-card p-4">
            <div className="flex items-start gap-3">
              <div className="admin-skeleton-avatar h-12 w-12 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="admin-skeleton-heading w-3/4" />
                <div className="admin-skeleton-text w-1/2" />
                <div className="flex gap-2 mt-2">
                  <div className="admin-skeleton h-5 w-14 rounded" />
                  <div className="admin-skeleton h-5 w-10 rounded" />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/30 flex items-center justify-between">
              <div className="admin-skeleton h-6 w-16" />
              <div className="admin-skeleton h-7 w-7 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Table view skeleton - Admin style
  return (
    <div className="admin-card overflow-hidden">
      {/* Table Header Skeleton */}
      <div className="px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-8">
          <div className="admin-skeleton-text w-16" />
          <div className="admin-skeleton-text w-14" />
          <div className="admin-skeleton-text w-12" />
          <div className="admin-skeleton-text w-10" />
          <div className="admin-skeleton-text w-14" />
          <div className="admin-skeleton-text w-12" />
          <div className="admin-skeleton-text w-10" />
        </div>
      </div>
      
      {/* Table Rows Skeleton */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-zinc-800/20 last:border-0 flex items-center gap-6"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className="flex items-center gap-3 w-48">
            <div className="admin-skeleton-avatar h-9 w-9 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="admin-skeleton-heading w-28" />
              <div className="admin-skeleton-text w-16" />
            </div>
          </div>
          <div className="admin-skeleton h-5 w-14 rounded" />
          <div className="admin-skeleton-text w-24" />
          <div className="admin-skeleton h-6 w-10" />
          <div className="admin-skeleton-text w-16" />
          <div className="admin-skeleton h-5 w-14 rounded" />
          <div className="admin-skeleton h-7 w-7 rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}