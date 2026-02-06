/**
 * LiveMatchSkeletonActions
 * 
 * Structural skeleton for the action toolbar (Add Player, Substitute, etc.)
 * Mirrors exact layout of the Live Match action bar.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LiveMatchSkeletonActionsProps {
  /** Show expanded version with more buttons */
  expanded?: boolean;
}

export function LiveMatchSkeletonActions({ expanded = true }: LiveMatchSkeletonActionsProps) {
  return (
    <div className={cn(
      "sticky top-[60px] z-10",
      "bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/60",
      "px-4 py-3"
    )}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Primary action buttons */}
        <Skeleton className="h-10 w-32 rounded-lg shrink-0" />
        <Skeleton className="h-10 w-28 rounded-lg shrink-0" />
        
        {expanded && (
          <>
            <Skeleton className="h-10 w-24 rounded-lg shrink-0" />
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          </>
        )}
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Filter/view toggles */}
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      
      {/* Player count indicator */}
      <div className="flex items-center gap-4 mt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
