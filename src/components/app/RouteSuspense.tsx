/**
 * RouteSuspense - Lightweight loading fallback for lazy routes
 * 
 * Shows a minimal skeleton during route chunk loading.
 * Designed to be fast and non-jarring for mobile users.
 */

import { Skeleton } from "@/components/ui/skeleton";

export function RouteSuspense() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in-0 duration-200">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl hidden lg:block" />
      </div>
      
      {/* Main content area */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/**
 * Minimal suspense for Live Match - ultra fast
 */
export function LiveMatchSuspense() {
  return (
    <div className="p-4 space-y-4 animate-in fade-in-0 duration-150">
      {/* Timer/header area */}
      <Skeleton className="h-24 rounded-xl" />
      
      {/* Player cards grid */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
    </div>
  );
}
