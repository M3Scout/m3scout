import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import heroStadium from "@/assets/hero-stadium.jpg";

const navLinks = [
  { href: "/sobre", label: "SOBRE NÓS" },
  { href: "/players", label: "ATLETAS" },
  { href: "/imprensa", label: "IMPRENSA" },
  { href: "/contact", label: "CONTATO" },
];

export function HeaderHero() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      
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

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  // Calculate parallax values
  const parallaxOffset = scrollY * 0.5; // Background moves at 50% of scroll speed
  const contentOpacity = Math.max(0, 1 - scrollY / 600); // Fade out content
  const contentTranslate = scrollY * 0.3; // Content moves slightly up

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

      {/* Navigation Bar - Overlay on Hero */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled ? "bg-black/90 backdrop-blur-md" : "bg-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white font-bold text-black text-xl transition-transform group-hover:scale-105">
                M3
              </div>
              <span className="text-lg font-semibold text-white tracking-wide hidden sm:block">
                AGENCY
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "px-5 py-2 text-sm font-medium tracking-[0.15em] transition-all duration-200",
                    "text-white/70 hover:text-white",
                    isActive(link.href) && "text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/app"
                className="ml-4 px-5 py-2 text-sm font-medium tracking-[0.1em] text-black bg-white rounded hover:bg-white/90 transition-colors"
              >
                ÁREA RESTRITA
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/95 backdrop-blur-lg transition-all duration-300 md:hidden",
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-2xl font-medium tracking-[0.2em] transition-colors",
                "text-white/60 hover:text-white",
                isActive(link.href) && "text-white"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/app"
            className="mt-4 px-8 py-3 text-lg font-medium tracking-[0.1em] text-black bg-white rounded hover:bg-white/90 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            ÁREA RESTRITA
          </Link>
        </div>
      </div>

      {/* Hero Content - Left Aligned with Parallax */}
      <div 
        className="relative z-10 flex h-full items-center will-change-transform"
        style={{
          opacity: contentOpacity,
          transform: `translateY(${contentTranslate}px)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            {/* Small tag */}
            <div className="mb-6 animate-fade-in">
              <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-white/80 border border-white/20 rounded-full">
                GESTÃO DE ATLETAS PROFISSIONAIS
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold text-white uppercase leading-[0.95] tracking-tight mb-6 animate-slide-up">
              M3
              <br />
              <span className="text-white/90">AGENCY</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/60 max-w-lg mb-10 leading-relaxed animate-slide-up delay-100">
              Conectamos os melhores talentos do futebol aos maiores clubes do mundo. 
              Excelência em gestão de carreiras esportivas.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up delay-200">
              <Link
                to="/players"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-[0.1em] text-black bg-white rounded hover:bg-white/90 transition-colors"
              >
                VER ATLETAS
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-[0.1em] text-white border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                FALAR CONOSCO
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

      {/* Bottom Gradient for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
