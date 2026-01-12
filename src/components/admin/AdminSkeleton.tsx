interface AdminSkeletonProps {
  className?: string;
}

export function AdminSkeletonText({ className = "w-24" }: AdminSkeletonProps) {
  return <div className={`admin-skeleton-text ${className}`} />;
}

export function AdminSkeletonHeading({ className = "w-32" }: AdminSkeletonProps) {
  return <div className={`admin-skeleton-heading ${className}`} />;
}

export function AdminSkeletonAvatar({ className = "h-10 w-10" }: AdminSkeletonProps) {
  return <div className={`admin-skeleton-avatar ${className}`} />;
}

export function AdminSkeletonCard({ className = "" }: AdminSkeletonProps) {
  return (
    <div className={`admin-card p-5 ${className}`}>
      <div className="space-y-3">
        <AdminSkeletonHeading className="w-20" />
        <AdminSkeletonText className="w-full" />
        <AdminSkeletonText className="w-3/4" />
      </div>
    </div>
  );
}

export function AdminSkeletonStat() {
  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="admin-skeleton h-8 w-8 rounded-lg" />
      </div>
      <div className="admin-skeleton h-8 w-16 mb-1" />
      <div className="admin-skeleton-text w-14" />
    </div>
  );
}

export function AdminSkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="admin-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/30 flex gap-8">
        <div className="admin-skeleton-text w-16" />
        <div className="admin-skeleton-text w-14" />
        <div className="admin-skeleton-text w-20" />
        <div className="admin-skeleton-text w-12" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-zinc-800/20 last:border-0 flex items-center gap-4"
        >
          <div className="flex items-center gap-3 flex-1">
            <AdminSkeletonAvatar className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <AdminSkeletonHeading className="w-32" />
              <AdminSkeletonText className="w-20" />
            </div>
          </div>
          <AdminSkeletonText className="w-16" />
          <AdminSkeletonText className="w-24" />
          <div className="admin-skeleton h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

export function AdminSkeletonDashboard() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="admin-header">
        <div className="space-y-2">
          <div className="admin-skeleton h-6 w-32" />
          <div className="admin-skeleton-text w-48" />
        </div>
        <div className="admin-skeleton h-9 w-32 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="admin-skeleton h-9 w-16" />
              <div className="admin-skeleton-text w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 admin-card">
          <div className="admin-card-header">
            <div className="admin-skeleton-text w-20" />
          </div>
          <div className="admin-card-body h-[180px]" />
        </div>
        <div className="lg:col-span-3 admin-card">
          <div className="admin-card-header">
            <div className="admin-skeleton-text w-32" />
          </div>
          <div className="divide-y divide-zinc-800/30">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="admin-skeleton h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <AdminSkeletonHeading className="w-28" />
                  <AdminSkeletonText className="w-20" />
                </div>
                <AdminSkeletonText className="w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}