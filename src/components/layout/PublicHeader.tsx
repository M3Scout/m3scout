import { Link, useLocation } from "react-router-dom";
import { Menu, X, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logoM3 from "@/assets/logo-m3.png";
export function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/sobre", label: "SOBRE" },
    { href: "/representacao-de-talentos", label: "REPRESENTAÇÃO DE TALENTOS" },
    { href: "/imprensa", label: "IMPRENSA" },
    { href: "/contato", label: "CONTATO" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <header className="fixed left-0 right-0 z-50 bg-black border-b border-zinc-900" style={{ top: 'var(--sat)', paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
      <div className="w-full max-w-[var(--page-max-width,1400px)] mx-auto" style={{ paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img 
              src={logoM3} 
              alt="M3 Agency" 
              className="h-8 sm:h-9 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "text-[11px] font-medium tracking-[0.1em] transition-colors whitespace-nowrap",
                    isActive(link.href)
                      ? "text-white"
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Desktop CTA - ÁREA RESTRITA */}
          <div className="hidden lg:flex items-center flex-shrink-0">
            <Link
              to="/app/auth"
              className="text-[11px] font-semibold tracking-[0.1em] text-white border border-[#C0001A] px-4 py-2 rounded-sm transition-colors hover:bg-[#C0001A] hover:text-white"
            >
              ÁREA RESTRITA
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden bg-black border-t border-zinc-900 animate-fade-in">
          <div className="w-full max-w-[var(--page-max-width,1400px)] mx-auto py-4" style={{ paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "px-4 py-3 text-[11px] font-medium tracking-[0.1em] transition-colors",
                    isActive(link.href)
                      ? "text-white bg-zinc-900"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-900/50"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* ÁREA RESTRITA - Mobile */}
              <Link
                to="/app/auth"
                className="mt-3 mx-4 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-white border border-[#C0001A] px-4 py-3 rounded-sm transition-colors hover:bg-[#C0001A]"
                onClick={() => setIsMenuOpen(false)}
              >
                <Lock size={14} />
                ÁREA RESTRITA
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
