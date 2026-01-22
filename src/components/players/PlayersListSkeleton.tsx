interface PlayersListSkeletonProps {
  viewMode: "table" | "scouting";
  count?: number;
}

export function PlayersListSkeleton({ viewMode, count = 12 }: PlayersListSkeletonProps) {
  // Premium 4-column grid skeleton matching AthleteCardPremium proportions (3:4)
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-[1360px] mx-auto px-4 md:px-6 lg:px-8"
      style={{ gap: 'clamp(24px, 2vw, 32px)' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="w-full rounded-md overflow-hidden"
          style={{ 
            aspectRatio: '3 / 4',
            minHeight: '380px',
            maxHeight: '480px',
            background: '#0a0c12',
            animationDelay: `${i * 50}ms`,
          }}
        >
          {/* Top Meta Bar Skeleton */}
          <div className="pt-3.5 px-3.5">
            <div 
              className="flex items-center justify-between min-h-[30px] px-2.5 py-2 rounded-sm"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="admin-skeleton h-4 w-12 rounded" />
              <div className="admin-skeleton h-4 w-16 rounded" />
            </div>
          </div>

          {/* Image Area Skeleton - Hero zone (flex-grow to fill) */}
          <div 
            className="relative w-full admin-skeleton"
            style={{ 
              height: '55%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
            }}
          />

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
