/**
 * LiveMatchSkeletonPlayerRow
 * 
 * Structural skeleton that mirrors the PremiumPlayerCard layout.
 * Matches exact dimensions and spacing to prevent CLS.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LiveMatchSkeletonPlayerRowProps {
  /** Animation delay index for staggered loading */
  index?: number;
  /** Show compact version (mobile) */
  compact?: boolean;
}

export function LiveMatchSkeletonPlayerRow({ 
  index = 0, 
  compact = false 
}: LiveMatchSkeletonPlayerRowProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "rounded-xl bg-zinc-900/60 border border-zinc-800/60",
        // Staggered animation
        "animate-pulse"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Position accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-700/50" />
      
      <div className="relative pl-4">
        <div className={cn(
          "p-3 space-y-2",
          compact && "p-2 space-y-1.5"
        )}>
          {/* Row 1: Avatar + Name + Buttons */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Skeleton className={cn(
              "shrink-0 rounded-full",
              compact ? "h-10 w-10" : "h-11 w-11"
            )} />
            
            {/* Name area */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-10 rounded-md" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          
          {/* Row 2: Key stats */}
          <div className="flex items-center gap-2 pt-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-5 w-6 rounded" />
              </div>
            ))}
          </div>
          
          {/* Row 3: Quick action buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton 
                key={i} 
                className={cn(
                  "rounded-lg",
                  compact ? "h-9 w-14" : "h-10 w-16"
                )} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
