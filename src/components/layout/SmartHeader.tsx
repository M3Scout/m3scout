import { Link, useLocation } from "react-router-dom";
import { Menu, X, Lock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import logoM3 from "@/assets/logo-m3.png";

const navLinks = [
  { href: "/sobre", label: "SOBRE" },
  { href: "/atletas", label: "REPRESENTAÇÃO DE TALENTOS" },
  { href: "/imprensa", label: "IMPRENSA" },
  { href: "/contato", label: "CONTATO" },
];

interface SmartHeaderProps {
  variant?: "default" | "transparent";
}

export function SmartHeader({ variant = "default" }: SmartHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 8;
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;
      
      setIsAtTop(currentScrollY < 10);
      
      if (Math.abs(scrollDiff) > scrollThreshold) {
        if (scrollDiff > 0 && currentScrollY > 120) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const showTransparent = variant === "transparent" && isAtTop;
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
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="flex h-[76px] md:h-[96px] items-center justify-between py-5 md:py-7">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center hover:opacity-90 transition-opacity duration-200"
            >
              <img 
                src={logoM3} 
                alt="M3 Agency" 
                className="h-8 md:h-10 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "relative min-h-[44px] flex items-center px-2",
                    "text-[12px] font-normal uppercase tracking-[0.14em]",
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
              
              {/* ÁREA RESTRITA - Desktop */}
              <Link
                to="/app/auth"
                className={cn(
                  "min-h-[44px] flex items-center px-5",
                  "border border-[#C0001A] rounded-sm",
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  "text-white hover:bg-[#C0001A] transition-colors duration-200"
                )}
              >
                ÁREA RESTRITA
              </Link>
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
            
            {/* ÁREA RESTRITA - Mobile */}
            <Link
              to="/app/auth"
              className={cn(
                "mt-6 min-h-[44px] flex items-center justify-center gap-2 px-8",
                "border border-[#C0001A] rounded-sm",
                "text-xs font-semibold uppercase tracking-[0.18em]",
                "text-white hover:bg-[#C0001A] transition-all duration-300"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              <Lock size={14} />
              ÁREA RESTRITA
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
