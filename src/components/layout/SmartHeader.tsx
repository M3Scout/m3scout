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
  const scrollThreshold = 5; // Minimum scroll to trigger hide/show
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;
      
      // Check if at top
      setIsAtTop(currentScrollY < 10);
      
      // Only trigger hide/show if scroll difference exceeds threshold
      if (Math.abs(scrollDiff) > scrollThreshold) {
        if (scrollDiff > 0 && currentScrollY > 100) {
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

  const isTransparent = variant === "transparent" && isAtTop;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
          isVisible ? "translate-y-0" : "-translate-y-full",
          isTransparent 
            ? "bg-transparent" 
            : "bg-black/95 backdrop-blur-sm border-b border-white/5"
        )}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center bg-white text-black text-xs font-black tracking-tight">
                M3
              </div>
              <span className="text-sm font-medium tracking-wider uppercase hidden sm:inline">
                Agency
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "relative text-[11px] font-medium uppercase tracking-[0.15em] text-white/70 hover:text-white transition-colors duration-200",
                    isActive(link.href) && "text-white"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute -bottom-1 left-0 w-full h-px bg-white/50" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
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
        <div className="flex flex-col items-center justify-center h-full">
          <nav className="flex flex-col items-center gap-8">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-lg font-medium uppercase tracking-[0.2em] text-white/70 hover:text-white transition-all duration-300",
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
              className="mt-8 px-8 py-3 border border-white/30 text-white/70 hover:text-white hover:border-white/60 text-xs uppercase tracking-[0.2em] transition-all duration-300"
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
