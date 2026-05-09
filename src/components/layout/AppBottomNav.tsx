import { Link, useLocation } from "react-router-dom";
import { Home, Users, ClipboardList, Radio, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useSidebar } from "@/hooks/useSidebar";
import "./MobileBottomNav.css";

const items = [
  { to: "/app", label: "Início", Icon: Home, match: (p: string) => p === "/app" || p === "/app/" },
  { to: "/app/players", label: "Atletas", Icon: Users, match: (p: string) => p.startsWith("/app/players") },
  { to: "/app/reports", label: "Relatórios", Icon: ClipboardList, match: (p: string) => p.startsWith("/app/reports") || p.startsWith("/app/scouting") },
  { to: "/app/live-match", label: "Ao Vivo", Icon: Radio, match: (p: string) => p.startsWith("/app/live-match") },
  { to: "/app/goals-monitor", label: "Metas", Icon: Target, match: (p: string) => p.startsWith("/app/goals") },
];

export function AppBottomNav() {
  const location = useLocation();
  const { mobileMenuOpen } = useSidebar();
  const activeIdx = items.findIndex((i) => i.match(location.pathname));

  return (
    <nav className="m3-bottom-nav" aria-label="Navegação rápida">
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
                  className="m3-bottom-nav__pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="m3-bottom-nav__content">
                <Icon size={18} strokeWidth={2} />
                {isActive && <span className="m3-bottom-nav__label">{item.label}</span>}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
