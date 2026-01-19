import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns whether the viewport is mobile-sized.
 * CRITICAL: Returns a stable boolean from the first render to prevent
 * hook count mismatches when components conditionally render based on this value.
 */
export function useIsMobile(): boolean {
  // Initialize with SSR-safe default that won't change on first client render
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    // Default to false for SSR
    return false;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Set initial value in case the lazy initializer was wrong
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
