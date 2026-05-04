import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import "./LandingHero.css";

const navLinks = [
  { href: "/sobre", label: "Sobre" },
  { href: "/atletas", label: "Talentos" },
  { href: "/imprensa", label: "Imprensa" },
  { href: "/contato", label: "Contato" },
];

export function LandingHero() {
  const [scrolled, setScrolled] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  // Scroll: nav background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Custom cursor (desktop only — CSS hides on touch)
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;

    const move = (e: PointerEvent) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;
      // Dot follows instantly
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };

    const animate = () => {
      // Smooth lerp for the ring
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.18;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.18;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", move);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", move);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onHoverEnter = useCallback((variant: "hover" | "text") => () => {
    cursorRef.current?.classList.add(variant === "text" ? "is-text" : "is-hover");
  }, []);
  const onHoverLeave = useCallback(() => {
    cursorRef.current?.classList.remove("is-hover", "is-text");
  }, []);

  return (
    <div className="lp-root">
      {/* Custom cursor */}
      <div ref={cursorRef} className="lp-cursor" aria-hidden="true" />
      <div ref={dotRef} className="lp-cursor-dot" aria-hidden="true" />

      {/* NAV agora é renderizado pelo PublicLayout (LandingNav) */}

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true">
          <div className="lp-hero__bg-grid" />
        </div>

        <div className="lp-hero__inner">
          <h1
            className="lp-hero__title"
            onMouseEnter={onHoverEnter("text")}
            onMouseLeave={onHoverLeave}
          >
            <span className="lp-hero__title-row">Futebol</span>
            <span className="lp-hero__title-row">
              Como Ele<span className="lp-circle" aria-hidden="true" />
            </span>
            <span className="lp-hero__title-row is-accent">Deveria Ser.</span>
          </h1>

          <p className="lp-hero__lead">
            <strong>Dados reais, leitura humana, decisão profissional.</strong>{" "}
            Conectamos atletas, clubes e oportunidades reais — com método,
            relacionamento e visão de longo prazo.
          </p>

          <div className="lp-hero__actions">
            <Link
              to="/atletas"
              className="lp-btn lp-btn--primary"
              onMouseEnter={onHoverEnter("hover")}
              onMouseLeave={onHoverLeave}
            >
              Ver Atletas →
            </Link>
            <Link
              to="/contato"
              className="lp-btn lp-btn--ghost"
              onMouseEnter={onHoverEnter("hover")}
              onMouseLeave={onHoverLeave}
            >
              Falar com a M3 →
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="lp-hero__scroll" aria-hidden="true">
          <span>Explorar</span>
          <div className="lp-hero__scroll-line" />
        </div>

        {/* Side text */}
        <div className="lp-hero__side" aria-hidden="true">
          M3 / 2025 — Inteligência em Futebol
        </div>
      </section>
    </div>
  );
}
