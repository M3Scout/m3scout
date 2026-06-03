import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Newspaper, Info, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import "./MobileBottomNav.css";

const items = [
  { to: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  { to: "/sobre", label: "Sobre", Icon: Info, match: (p: string) => p.startsWith("/sobre") },
  { to: "/atletas", label: "Talentos", Icon: Users, match: (p: string) => p.startsWith("/atletas") || p.startsWith("/representacao") },
  { to: "/imprensa", label: "Imprensa", Icon: Newspaper, match: (p: string) => p.startsWith("/imprensa") || p.startsWith("/news") },
  { to: "/contato", label: "Contato", Icon: Mail, match: (p: string) => p.startsWith("/contato") || p.startsWith("/contact") },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIdx = items.findIndex((i) => i.match(location.pathname));

  // Drag
  const navRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartXRef = useRef(0);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const displayIdx = dragTarget !== null ? dragTarget : activeIdx;

  // Glass warp
  const prevDisplayRef = useRef(displayIdx);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const rafRef = useRef<number | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  const triggerWarp = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setIsWarping(true);
    const startTime = performance.now();
    const duration = 380;

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const intensity = Math.sin(t * Math.PI);
      turbRef.current?.setAttribute("baseFrequency", `${(0.012 + intensity * 0.022).toFixed(4)}`);
      dispRef.current?.setAttribute("scale", `${(intensity * 38).toFixed(1)}`);

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
  }, []);

  useEffect(() => {
    if (prevDisplayRef.current !== displayIdx) {
      prevDisplayRef.current = displayIdx;
      triggerWarp();
    }
  }, [displayIdx, triggerWarp]);

  useEffect(() => {
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    didDragRef.current = false;
    dragStartXRef.current = e.clientX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (Math.abs(e.clientX - dragStartXRef.current) > 8) isDraggingRef.current = true;
    if (!isDraggingRef.current || !navRef.current) return;

    const rect = navRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const idx = Math.max(0, Math.min(items.length - 1, Math.floor(relX / (rect.width / items.length))));
    setDragTarget(idx);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasDragging = isDraggingRef.current;
    let targetIdx: number | null = null;

    if (wasDragging && dragTarget !== null) {
      targetIdx = dragTarget;
      didDragRef.current = true;
    } else if (navRef.current) {
      // Tap — compute item under pointer and navigate
      const rect = navRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      targetIdx = Math.max(0, Math.min(items.length - 1, Math.floor(relX / (rect.width / items.length))));
    }

    if (targetIdx !== null && targetIdx !== activeIdx) {
      navigate(items[targetIdx].to);
    }

    isDraggingRef.current = false;
    setDragTarget(null);
  };


  return (
    <nav className="m3-bottom-nav" aria-label="Navegação principal">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="m3-public-glass-lens" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence ref={turbRef} type="turbulence" baseFrequency="0" numOctaves="2" seed="5" result="turbulence" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="turbulence" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div
        ref={navRef}
        className="m3-bottom-nav__inner"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        {items.map((item, idx) => {
          const isDisplayActive = idx === displayIdx;
          const isActive = idx === activeIdx;
          const { Icon } = item;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`m3-bottom-nav__item ${isDisplayActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                // Navigation is handled in pointerUp on the parent
                e.preventDefault();
                didDragRef.current = false;
              }}
            >

              {isDisplayActive && (
                <motion.span
                  layoutId="m3-public-nav-pill"
                  className="m3-bottom-nav__pill"
                  transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.9 }}
                />
              )}

              <span className="m3-bottom-nav__content">
                <Icon size={22} strokeWidth={2} />
              </span>
              <span className="m3-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
