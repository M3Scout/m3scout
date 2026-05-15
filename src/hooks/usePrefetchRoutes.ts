/**
 * usePrefetchRoutes Hook
 * 
 * Triggers intelligent route prefetching after boot_complete.
 * Prioritizes Live Match for mobile admin/scout users.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/authContext";
import { prefetchLiveMatch, prefetchSecondaryRoutes } from "@/lib/routePrefetch";

export function usePrefetchRoutes() {
  const { session, rolesLoading, isPlayer } = useAuth();
  const hasPrefetched = useRef(false);
  
  useEffect(() => {
    // Wait for auth to be ready and avoid duplicate prefetch
    if (rolesLoading || !session?.user || hasPrefetched.current) return;
    
    hasPrefetched.current = true;
    
    // Athletes don't need Live Match prefetch - they use dashboard
    if (isPlayer) {
      // Prefetch athlete-focused routes instead
      prefetchSecondaryRoutes();
      return;
    }
    
    // For admin/scout: Prefetch Live Match first (most used on mobile)
    prefetchLiveMatch();
    
    // Then secondary routes after a delay
    const timer = setTimeout(() => {
      prefetchSecondaryRoutes();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [session?.user, rolesLoading, isPlayer]);
}
