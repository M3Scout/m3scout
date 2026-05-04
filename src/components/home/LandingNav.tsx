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
            <Lock size={12} />
            Área Restrita
          </Link>
        </div>
      </header>
    </div>
  );
}
