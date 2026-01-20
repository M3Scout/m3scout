import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns whether the viewport is mobile-sized.
 * 
 * CRITICAL: Uses lazy initialization AND stable key-based remounting strategy
 * to prevent React hook count mismatches (error #310) when components 
 * conditionally render based on this value.
 * 
 * The value is stable from the first render, and any subsequent changes
 * (e.g., window resize) will trigger a re-render but components should use
 * keys that include the mobile state to force complete remounts.
 */
export function useIsMobile(): boolean {
  // Initialize with SSR-safe lazy evaluation that runs synchronously on first render
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    // Only listen for changes after initial render - don't set initial value here
    // as that causes a second render that can break hook order in child components
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
