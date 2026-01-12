import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/sobre", label: "SOBRE" },
  { href: "/atletas", label: "REPRESENTAÇÃO DE TALENTOS" },
  { href: "/marketing", label: "MARKETING" },
  { href: "/eventos", label: "EVENTOS AO VIVO" },
  { href: "/vendas", label: "VENDAS" },
];

interface SmartHeaderProps {
  variant?: "default" | "transparent";
}

export function SmartHeader({ variant = "default" }: SmartHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 8; // Minimum scroll to trigger hide/show (prevents jitter)
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;
      
      // Check if at top
      setIsAtTop(currentScrollY < 10);
      
      // Only trigger hide/show if scroll difference exceeds threshold
      if (Math.abs(scrollDiff) > scrollThreshold) {
        if (scrollDiff > 0 && currentScrollY > 120) {
          // Scrolling down & past header height
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  // Only transparent when at very top AND variant is transparent
  const showTransparent = variant === "transparent" && isAtTop;
  // Solid black when scrolled (regardless of scroll direction)
  const isScrolled = !isAtTop;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-[240ms] ease-in-out",
          isVisible ? "translate-y-0" : "-translate-y-full",
          showTransparent 
            ? "bg-transparent" 
            : "bg-black border-b border-white/[0.06]",
          isScrolled && "backdrop-blur-[6px]"
        )}
        style={!showTransparent ? { backgroundColor: "#000" } : undefined}
      >
        {/* Desktop: 96px height with 28px vertical padding */}
        {/* Mobile: 76px height with 20px vertical padding */}
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="flex h-[76px] md:h-[96px] items-center justify-between py-5 md:py-7">
            {/* Logo - slightly larger, vertically centered */}
            <Link 
              to="/" 
              className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity duration-200"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center bg-white text-black text-sm md:text-base font-black tracking-tight">
                M3
              </div>
              <span className="text-sm md:text-[15px] font-medium tracking-[0.12em] uppercase hidden sm:inline">
                Agency
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "relative min-h-[44px] flex items-center px-2 xl:px-3",
                    "text-[13px] font-normal uppercase tracking-[0.16em]",
                    "text-white/65 hover:text-white transition-colors duration-200",
                    isActive(link.href) && "text-white"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-2 left-2 right-2 h-px bg-white/40" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black transition-all duration-300 lg:hidden",
          isMenuOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        )}
      >
        {/* Account for header height on mobile */}
        <div className="flex flex-col items-center justify-center h-full pt-[76px]">
          <nav className="flex flex-col items-center gap-6">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "min-h-[44px] flex items-center px-4",
                  "text-base font-normal uppercase tracking-[0.18em]",
                  "text-white/60 hover:text-white transition-all duration-300",
                  isMenuOpen && "animate-fade-in",
                  isActive(link.href) && "text-white"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile CTA */}
            <Link
              to="/app"
              className={cn(
                "mt-6 min-h-[44px] flex items-center px-8",
                "border border-white/25 hover:border-white/50",
                "text-xs font-normal uppercase tracking-[0.18em]",
                "text-white/60 hover:text-white transition-all duration-300"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Área Restrita
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
