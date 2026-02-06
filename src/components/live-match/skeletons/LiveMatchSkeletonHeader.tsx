/**
 * LiveMatchSkeletonHeader
 * 
 * Structural skeleton that mirrors the GameScoreboard layout exactly.
 * Prevents layout shift when Live Match data loads.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LiveMatchSkeletonHeader() {
  return (
    <div className="relative">
      {/* Glow effect placeholder */}
      <div className="absolute inset-0 rounded-2xl blur-xl bg-zinc-500/5" />
      
      <div className="relative rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90 overflow-hidden shadow-2xl">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-zinc-800/40 bg-zinc-900/50 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Live indicator skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            {/* Half badge skeleton */}
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          
          {/* Match info skeleton */}
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-36 ml-auto" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        </div>
        
        {/* Timer display section */}
        <div className="p-6">
          <div className="relative">
            {/* Progress bar placeholder */}
            <div className="absolute inset-0 rounded-xl bg-zinc-800/30 overflow-hidden">
              <Skeleton className="h-full w-1/3" />
            </div>
            
            {/* Timer content */}
            <div className="relative py-8 rounded-xl border-2 border-zinc-700/40 flex flex-col items-center justify-center">
              {/* Large timer display */}
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-20 w-32 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Action bar placeholder */}
        <div className="px-4 pb-4 space-y-3">
          {/* Added time controls */}
          <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/40">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-1 ml-auto">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-12 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
