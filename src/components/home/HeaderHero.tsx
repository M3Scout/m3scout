import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import heroStadium from "@/assets/hero-stadium.jpg";

export function HeaderHero() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only update parallax when hero is visible
      if (heroRef.current) {
        const heroHeight = heroRef.current.offsetHeight;
        if (currentScrollY <= heroHeight) {
          setScrollY(currentScrollY);
        }
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  // Calculate parallax values
  const parallaxOffset = scrollY * 0.5;
  const contentOpacity = Math.max(0, 1 - scrollY / 600);
  const contentTranslate = scrollY * 0.3;

  return (
    <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
      {/* Background Image with Parallax */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
        style={{ 
          backgroundImage: `url(${heroStadium})`,
          transform: `translateY(${parallaxOffset}px) scale(1.1)`,
        }}
      />

      {/* Dark Overlay - Gradient from top and bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      {/* Hero Content - Left Aligned with Parallax */}
      <div 
        className="relative z-10 flex h-full items-center will-change-transform pt-14"
        style={{
          opacity: contentOpacity,
          transform: `translateY(${contentTranslate}px)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            {/* Small tag */}
            <div className="mb-6 animate-fade-in">
              <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-white/80 border border-white/20">
                GESTÃO DE ATLETAS PROFISSIONAIS
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white uppercase leading-[0.95] tracking-tight mb-6 animate-slide-up">
              M3
              <br />
              <span className="text-white/90">AGENCY</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/60 max-w-lg mb-10 leading-relaxed animate-slide-up delay-100">
              Conectamos os melhores talentos do futebol aos maiores clubes do mundo. 
              Excelência em gestão de carreiras esportivas.
            </p>

            {/* CTA Buttons - No rounded corners */}
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up delay-200">
              <Link
                to="/players"
                className="inline-flex items-center justify-center px-8 py-4 text-xs font-medium tracking-[0.15em] uppercase text-black bg-white hover:bg-white/90 transition-colors"
              >
                Ver Atletas
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-8 py-4 text-xs font-medium tracking-[0.15em] uppercase text-white border border-white/30 hover:bg-white/10 transition-colors"
              >
                Falar Conosco
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator - Bottom Right */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 right-8 z-10 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors animate-bounce"
        aria-label="Scroll to content"
      >
        <span className="text-xs tracking-[0.2em] hidden sm:block">SCROLL</span>
        <ChevronDown className="w-6 h-6" />
      </button>

      {/* Bottom Gradient for smooth transition to dark section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
