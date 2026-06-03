import { Link, useLocation } from "react-router-dom";
import { Home, Users, ClipboardList, Radio, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useSidebar } from "@/hooks/useSidebar";
import { useEffect, useRef, useState } from "react";
import "./MobileBottomNav.css";

const items = [
  { to: "/dashboard", label: "Início", Icon: Home, match: (p: string) => p === "/dashboard" || p === "/dashboard/" },
  { to: "/dashboard/atletas", label: "Atletas", Icon: Users, match: (p: string) => p.startsWith("/dashboard/atletas") },
  { to: "/dashboard/relatorios", label: "Relatórios", Icon: ClipboardList, match: (p: string) => p.startsWith("/dashboard/relatorios") || p.startsWith("/dashboard/scouting") },
  { to: "/dashboard/aovivo", label: "Ao Vivo", Icon: Radio, match: (p: string) => p.startsWith("/dashboard/aovivo") },
  { to: "/dashboard/metas", label: "Metas", Icon: Target, match: (p: string) => p.startsWith("/dashboard/metas") || p.startsWith("/dashboard/goals") },
];

export function AppBottomNav() {
  const location = useLocation();
  const { mobileMenuOpen } = useSidebar();
  const activeIdx = items.findIndex((i) => i.match(location.pathname));
  const prevIdxRef = useRef(activeIdx);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const rafRef = useRef<number | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  // Trigger glass warp when active index changes
  useEffect(() => {
    if (prevIdxRef.current === activeIdx) return;
    prevIdxRef.current = activeIdx;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    setIsWarping(true);
    const startTime = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // Bell curve: peaks at t=0.4, fades at t=1
      const intensity = Math.sin(t * Math.PI);
      const freq = intensity * 0.018;
      const scale = intensity * 22;

      turbRef.current?.setAttribute("baseFrequency", `${freq.toFixed(4)}`);
      dispRef.current?.setAttribute("scale", `${scale.toFixed(1)}`);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        turbRef.current?.setAttribute("baseFrequency", "0");
        dispRef.current?.setAttribute("scale", "0");
        setIsWarping(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [activeIdx]);

  if (location.pathname.startsWith("/dashboard/aovivo/")) return null;

  return (
    <nav className="m3-bottom-nav" aria-label="Navegação rápida">
      {/* SVG glass distortion filter */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="m3-glass-lens" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={turbRef}
              type="turbulence"
              baseFrequency="0"
              numOctaves="2"
              seed="3"
              result="turbulence"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="turbulence"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        className="m3-bottom-nav__inner"
        animate={
          mobileMenuOpen
            ? { opacity: 0, y: 8, pointerEvents: "none" }
            : { opacity: 1, y: 0, pointerEvents: "auto" }
        }
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {items.map((item, idx) => {
          const isActive = idx === activeIdx;
          const { Icon } = item;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`m3-bottom-nav__item ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="app-bottom-nav-pill"
                  className={`m3-bottom-nav__pill${isWarping ? " m3-bottom-nav__pill--warping" : ""}`}
                  style={isWarping ? { filter: "url(#m3-glass-lens)" } : undefined}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="m3-bottom-nav__content">
                <Icon size={22} strokeWidth={2} />
              </span>
              <span className="m3-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
