import { useEffect, useRef, useState } from "react";
import { LandingHeroField } from "./LandingHeroField";
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

  // Custom cursor — bolinha de futebol seguindo o mouse (desktop only, CSS
  // esconde em touch)
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;

    const move = (e: PointerEvent) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;
    };

    const animate = () => {
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

  return (
    <div className="lp-root">
      {/* Custom cursor */}
      <div ref={cursorRef} className="lp-cursor" aria-hidden="true">
        ⚽
      </div>

      {/* NAV agora é renderizado pelo PublicLayout (LandingNav) */}

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero__turf" aria-hidden="true">
          <div
            className="lp-hero__turf-stripes"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 40px, transparent 40px, transparent 80px)",
            }}
          />
        </div>
        <div className="lp-hero__field-frame">
          <LandingHeroField />
        </div>
        <div className="lp-hero__overlay" aria-hidden="true" />
      </section>
    </div>
  );
}
