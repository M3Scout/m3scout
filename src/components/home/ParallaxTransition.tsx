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

  // Detect mobile (< 768px) and tablet (768–1366px) to disable parallax effects
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      // Disable parallax/opacity effects on mobile (<768px) and tablet (768–1366px)
      setIsMobileOrTablet(width <= 1366);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    // Don't run parallax on mobile/tablet
    if (prefersReducedMotion || isMobileOrTablet) return;

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
  }, [prefersReducedMotion, isMobileOrTablet]);

  // Mobile/Tablet: No parallax, no opacity animation — sections render at full brightness
  // BUG FIX: Remove any potential background inheritance issues
  if (isMobileOrTablet || prefersReducedMotion) {
    return (
      <div ref={ref} className="relative" style={{ backgroundColor: 'transparent' }}>
        {children}
      </div>
    );
  }

  // Desktop only: Apply parallax and opacity effects
  // START at full opacity (1.0) when near top, fade slightly as user scrolls past
  const parallaxOffset = (1 - scrollProgress) * 40;
  // Opacity: starts at 0.85, goes to 1.0 as user scrolls to it
  // This prevents "invisible" sections on cold load
  const opacity = Math.min(1, 0.85 + scrollProgress * 0.15);

  return (
    <div 
      ref={ref}
      className="relative"
      style={{
        transform: `translateY(${parallaxOffset}px)`,
        opacity,
        transition: "opacity 0.1s ease-out",
        backgroundColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
}
