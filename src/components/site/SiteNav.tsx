import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoM3 from "@/assets/logo-m3.png";
import "./m3site.css";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/** Menu fixo em vidro + menu mobile (burger), conforme m3-home-2.html. */
export function SiteNav() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // a cada troca de rota: fecha o menu e volta ao topo (exceto links com #seção)
  useEffect(() => {
    setMenuOpen(false);
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  const talentosLink = (cls?: string) => <Link to="/atletas" className={cls}>Talentos</Link>;

  const on = (p: string) => location.pathname === p || location.pathname.startsWith(p + "/");

  return (
    <div className={`m3s m3s-nav ${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <header className="bar">
        <Link
          className="logo"
          to="/"
          aria-label="M3 Agency — início"
          onClick={(e) => { if (isHome) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
        >
          <img src={logoM3} alt="" width={90} height={36} style={{ height: 22, width: "auto" }} />
        </Link>
        <nav className="links" aria-label="Principal">
          {talentosLink(on("/atletas") || on("/players") || on("/atleta") ? "on" : undefined)}
          <Link to="/imprensa" className={on("/imprensa") ? "on" : undefined}>Imprensa</Link>
          <Link to="/contato" className={on("/contato") || on("/contact") ? "on" : undefined}>Contato</Link>
        </nav>
        <Link className="cta" to="/dashboard/auth">
          <LockIcon />
          Área restrita
        </Link>
        <button
          className="burger"
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="sheet"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i />
          <i />
        </button>
      </header>
      <div className="sheet" id="sheet">
        <nav aria-label="Principal (mobile)">
          {talentosLink()}
          <Link to="/imprensa" onClick={() => setMenuOpen(false)}>Imprensa</Link>
          <Link to="/contato" onClick={() => setMenuOpen(false)}>Contato</Link>
        </nav>
        <Link className="cta" to="/dashboard/auth" onClick={() => setMenuOpen(false)}>
          <LockIcon />
          Área restrita
        </Link>
      </div>
    </div>
  );
}
