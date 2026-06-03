import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, ClipboardList, Radio, Target } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useSidebar } from "@/hooks/useSidebar";
import { useEffect, useRef, useState } from "react";
import "./MobileBottomNav.css";

const items = [
  { to: "/dashboard",           label: "Início",    Icon: Home,         match: (p: string) => p === "/dashboard" || p === "/dashboard/" },
  { to: "/dashboard/atletas",   label: "Atletas",   Icon: Users,        match: (p: string) => p.startsWith("/dashboard/atletas") },
  { to: "/dashboard/relatorios",label: "Relatórios",Icon: ClipboardList,match: (p: string) => p.startsWith("/dashboard/relatorios") || p.startsWith("/dashboard/scouting") },
  { to: "/dashboard/aovivo",    label: "Ao Vivo",   Icon: Radio,        match: (p: string) => p.startsWith("/dashboard/aovivo") },
  { to: "/dashboard/metas",     label: "Metas",     Icon: Target,       match: (p: string) => p.startsWith("/dashboard/metas") || p.startsWith("/dashboard/goals") },
];

const N = items.length;

export function AppBottomNav() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { mobileMenuOpen } = useSidebar();

  const activeIdx  = items.findIndex(i => i.match(location.pathname));
  const navRef     = useRef<HTMLDivElement>(null);

  // ── Pill position: fraction [0 … N-1] → CSS left %
  const pillFrac   = useMotionValue(activeIdx);
  const pillSpring = useSpring(pillFrac, { stiffness: 340, damping: 28, mass: 0.8 });
  const pillLeft   = useTransform(pillSpring, v => `${(v / N) * 100}%`);

  // Which item the pill is visually over
  const [displayIdx, setDisplayIdx] = useState(activeIdx);

  // Drag bookkeeping
  const isDraggingRef  = useRef(false);
  const didDragRef     = useRef(false);
  const startXRef      = useRef(0);
  const startFracRef   = useRef(activeIdx);

  // Jump pill to new active on route change (not dragging)
  useEffect(() => {
    if (!isDraggingRef.current) {
      pillFrac.set(activeIdx);
      setDisplayIdx(activeIdx);
    }
  }, [activeIdx]); // eslint-disable-line

  // ── Glass lens: SVG feImage displacement (radial = lens, not noise)
  const feImageRef = useRef<SVGFEImageElement>(null);
  const dispRef    = useRef<SVGFEDisplacementMapElement>(null);
  const [lensMap, setLensMap] = useState<string>("");
  const rafRef     = useRef<number | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  // Build the radial displacement map once on mount
  useEffect(() => {
    const SIZE = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(SIZE, SIZE);
    const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = (x - cx) / r, dy = (y - cy) / r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Radial lens: push pixels outward from center (magnification)
        const strength = Math.max(0, 1 - dist * dist) * 0.6;
        const i = (y * SIZE + x) * 4;
        img.data[i]   = Math.round(128 + dx * strength * 128); // R → X disp
        img.data[i+1] = Math.round(128 + dy * strength * 128); // G → Y disp
        img.data[i+2] = 128;
        img.data[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    setLensMap(canvas.toDataURL());
  }, []);

  const triggerWarp = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsWarping(true);
    const t0 = performance.now();
    const dur = 350;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const s = Math.sin(t * Math.PI) * 28;
      dispRef.current?.setAttribute("scale", s.toFixed(1));
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { dispRef.current?.setAttribute("scale", "0"); setIsWarping(false); rafRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    didDragRef.current    = false;
    startXRef.current     = e.clientX;
    startFracRef.current  = pillFrac.get();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - startXRef.current;
    if (!isDraggingRef.current && Math.abs(dx) > 6) isDraggingRef.current = true;
    if (!isDraggingRef.current || !navRef.current) return;

    const navW = navRef.current.offsetWidth;
    const itemW = navW / N;

    // Continuous fraction: drag distance → fraction offset
    const fracDelta = dx / itemW;
    const newFrac   = Math.max(0, Math.min(N - 1, startFracRef.current + fracDelta));
    pillFrac.set(newFrac); // instant — no spring during drag

    // Update display index when crossing item boundary
    const newIdx = Math.max(0, Math.min(N - 1, Math.round(newFrac)));
    if (newIdx !== displayIdx) {
      setDisplayIdx(newIdx);
      triggerWarp();
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;

    const finalIdx = Math.max(0, Math.min(N - 1, Math.round(pillFrac.get())));

    // Spring-snap to integer position
    pillFrac.set(pillFrac.get()); // freeze current value
    // Then let spring animate to snapped position
    // (re-enable spring by driving pillFrac to integer, spring follows)
    // We achieve this by setting the motion value — spring does the rest
    pillFrac.set(pillFrac.get()); // current fractional
    // Animate to integer via spring
    setTimeout(() => pillFrac.set(finalIdx), 0);

    if (finalIdx !== activeIdx) {
      didDragRef.current = true;
      navigate(items[finalIdx].to);
    }
    isDraggingRef.current = false;
    triggerWarp();
  };

  if (location.pathname.startsWith("/dashboard/aovivo/")) return null;

  const pillWidthPct = `${100 / N}%`;

  return (
    <nav className="m3-bottom-nav" aria-label="Navegação rápida">
      {/* Radial lens displacement filter */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="m3-lens" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feImage ref={feImageRef} href={lensMap} result="map"
              x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="map"
              scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <motion.div
        ref={navRef}
        className="m3-bottom-nav__inner"
        style={{ position: "relative", touchAction: "none", userSelect: "none" }}
        animate={mobileMenuOpen
          ? { opacity: 0, y: 8, pointerEvents: "none" }
          : { opacity: 1, y: 0, pointerEvents: "auto" }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Floating pill — single element, moves continuously */}
        <motion.span
          className={`m3-bottom-nav__pill-float${isWarping ? " m3-bottom-nav__pill--warping" : ""}`}
          style={{
            position: "absolute",
            top: 0, bottom: 0,
            left: pillLeft,
            width: pillWidthPct,
            filter: isWarping ? "url(#m3-lens)" : undefined,
          }}
        />

        {items.map((item, idx) => {
          const isActive = idx === displayIdx;
          const { Icon } = item;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`m3-bottom-nav__item ${isActive ? "is-active" : ""}`}
              aria-current={idx === activeIdx ? "page" : undefined}
              onClick={e => {
                if (didDragRef.current) { e.preventDefault(); didDragRef.current = false; }
              }}
            >
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
