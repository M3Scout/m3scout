import { Link } from "react-router-dom";

import { useEffect, useState } from "react";
import logoM3 from "@/assets/logo-m3.png";
import "./LandingHero.css";

const navLinks = [
  { href: "/sobre", label: "Sobre" },
  { href: "/atletas", label: "Talentos" },
  { href: "/imprensa", label: "Imprensa" },
  { href: "/contato", label: "Contato" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp-root">
      <header className={`lp-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="lp-nav__inner">
          {/* Spacer for mobile centering */}
          <div className="lp-nav__spacer lg:hidden" />

          <Link to="/" className="lp-nav__logo" aria-label="M3 Agency">
            <img src={logoM3} alt="M3 Agency" className="lp-nav__logo-img" width={90} height={36} />
          </Link>

          <nav className="lp-nav__links" aria-label="Navegação principal">
            {navLinks.map((l) => (
              <Link key={l.href} to={l.href} className="lp-nav__link">
                {l.label}
              </Link>
            ))}
          </nav>

          <Link to="/app/auth" className="lp-nav__cta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Área Restrita
          </Link>
        </div>
      </header>
    </div>
  );
}
