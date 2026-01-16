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

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-500 ease-out",
          isVisible ? "translate-y-0" : "-translate-y-full",
          showTransparent 
            ? "bg-transparent" 
            : "bg-black/90 backdrop-blur-md border-b border-white/[0.04]"
        )}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="flex h-[72px] md:h-[88px] items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center hover:opacity-80 transition-opacity duration-300"
            >
              <img 
                src={logoM3} 
                alt="M3 Agency" 
                className="h-7 md:h-9 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "group relative min-h-[44px] flex items-center px-4",
                    "text-[11px] font-medium uppercase tracking-[0.18em]",
                    "text-white/50 hover:text-white transition-colors duration-300",
                    isActive(link.href) && "text-white"
                  )}
                >
                  {link.label}
                  {/* Hover underline */}
                  <span 
                    className={cn(
                      "absolute bottom-3 left-4 right-4 h-[1px] bg-white/60",
                      "origin-left transition-transform duration-300 ease-out",
                      "scale-x-0 group-hover:scale-x-100",
                      isActive(link.href) && "scale-x-100 bg-white/40"
                    )}
                  />
                </Link>
              ))}
              
              {/* ÁREA RESTRITA - Desktop (more discrete) */}
              <Link
                to="/app/auth"
                className={cn(
                  "ml-6 min-h-[36px] flex items-center gap-2 px-4",
                  "text-[10px] font-medium uppercase tracking-[0.15em]",
                  "text-white/40 hover:text-white/70 transition-all duration-300",
                  "border border-white/10 hover:border-white/25 rounded"
                )}
              >
                <Lock size={12} className="opacity-60" />
                ÁREA RESTRITA
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
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
            
            {/* ÁREA RESTRITA - Mobile (discrete) */}
            <Link
              to="/app/auth"
              className={cn(
                "mt-8 min-h-[40px] flex items-center justify-center gap-2 px-6",
                "text-[11px] font-medium uppercase tracking-[0.15em]",
                "text-white/40 hover:text-white/70 transition-all duration-300",
                "border border-white/15 hover:border-white/30 rounded"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              <Lock size={12} className="opacity-50" />
              ÁREA RESTRITA
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
