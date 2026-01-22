interface PlayersListSkeletonProps {
  viewMode: "table" | "scouting";
  count?: number;
}

export function PlayersListSkeleton({ viewMode, count = 12 }: PlayersListSkeletonProps) {
  // Premium card skeleton matching 420x560 dimensions
  return (
    <div 
      className="grid gap-6 md:gap-8 justify-center"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 420px))',
        maxWidth: '1360px',
        margin: '0 auto',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="w-full max-w-[420px] mx-auto rounded-xl overflow-hidden"
          style={{ 
            height: '560px',
            background: '#0a0c12',
            animationDelay: `${i * 50}ms`,
          }}
        >
          {/* Top Meta Bar Skeleton */}
          <div className="pt-3.5 px-3.5">
            <div 
              className="flex items-center justify-between min-h-[30px] px-2.5 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="admin-skeleton h-4 w-12 rounded" />
              <div className="admin-skeleton h-4 w-16 rounded" />
            </div>
          </div>

          {/* Image Area Skeleton - Hero zone */}
          <div className="relative w-full" style={{ height: '340px' }}>
            <div 
              className="absolute inset-0 admin-skeleton"
              style={{ 
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
              }}
            />
          </div>

          {/* Content Area Skeleton */}
          <div 
            className="p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {/* Name */}
            <div className="admin-skeleton-heading h-6 w-3/4 rounded" />
            
            {/* Age & Nationality */}
            <div className="flex items-center gap-3">
              <div className="admin-skeleton h-4 w-16 rounded" />
              <div className="admin-skeleton h-4 w-20 rounded" />
            </div>

            {/* Club */}
            <div className="admin-skeleton-text h-4 w-1/2 rounded" />

            {/* Priority bar */}
            <div className="pt-2">
              <div className="admin-skeleton h-1.5 w-full rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}