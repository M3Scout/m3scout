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

  const parallaxOffset = prefersReducedMotion ? 0 : (1 - scrollProgress) * 40;
  const opacity = prefersReducedMotion ? 1 : 0.3 + scrollProgress * 0.7;

  return (
    <div 
      ref={ref}
      className="relative"
      style={{
        transform: `translateY(${parallaxOffset}px)`,
        opacity,
        transition: "opacity 0.1s ease-out",
      }}
    >
      {/* Decorative Elements */}
      <div className="absolute -top-20 left-0 right-0 h-20 pointer-events-none overflow-hidden">
        {/* Gradient fade from hero */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        
        {/* Animated lines */}
        {!prefersReducedMotion && (
          <>
            <div 
              className="absolute left-1/4 top-0 w-px h-full bg-gradient-to-b from-white/5 to-transparent"
              style={{
                transform: `scaleY(${scrollProgress})`,
                transformOrigin: "top",
              }}
            />
            <div 
              className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-white/8 to-transparent"
              style={{
                transform: `scaleY(${scrollProgress})`,
                transformOrigin: "top",
                transitionDelay: "50ms",
              }}
            />
            <div 
              className="absolute left-3/4 top-0 w-px h-full bg-gradient-to-b from-white/5 to-transparent"
              style={{
                transform: `scaleY(${scrollProgress})`,
                transformOrigin: "top",
                transitionDelay: "100ms",
              }}
            />
          </>
        )}
      </div>

      {children}
    </div>
  );
}
