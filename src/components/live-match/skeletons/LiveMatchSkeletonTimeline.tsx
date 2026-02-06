/**
 * LiveMatchSkeletonTimeline
 * 
 * Structural skeleton for the event timeline sidebar.
 */

import { Skeleton } from "@/components/ui/skeleton";

interface LiveMatchSkeletonTimelineProps {
  /** Number of event items to show */
  itemCount?: number;
}

export function LiveMatchSkeletonTimeline({ itemCount = 5 }: LiveMatchSkeletonTimelineProps) {
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      
      {/* Timeline items */}
      <div className="space-y-3">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-start gap-3 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Time marker */}
            <div className="flex flex-col items-center shrink-0">
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-8 w-0.5 mt-1" />
            </div>
            
            {/* Event content */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
            
            {/* Event badge */}
            <Skeleton className="h-6 w-12 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
