import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ParallaxTransitionProps {
  children?: React.ReactNode;
}

export function ParallaxTransition({ children }: ParallaxTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress: 0 when element enters viewport, 1 when fully visible
      const progress = Math.max(0, Math.min(1, 
        (windowHeight - rect.top) / (windowHeight + rect.height * 0.5)
      ));
      
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prefersReducedMotion]);

  // Detect tablet for iPad-specific fix
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width <= 1366);
    };
    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  const parallaxOffset = prefersReducedMotion ? 0 : (1 - scrollProgress) * 40;
  // iPad fix: Ensure full opacity on tablet to prevent dark overlay appearance
  const opacity = prefersReducedMotion || isTablet ? 1 : 0.3 + scrollProgress * 0.7;

  return (
    <div 
      ref={ref}
      className="relative"
      style={{
        transform: isTablet ? 'none' : `translateY(${parallaxOffset}px)`,
        opacity,
        transition: "opacity 0.1s ease-out",
        // iPad fix: Reset any filters/backdrops that could cause darkening
        filter: 'none',
        backdropFilter: 'none',
      }}
    >
      {children}
    </div>
  );
}
