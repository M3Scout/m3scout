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
      {children}
    </div>
  );
}
