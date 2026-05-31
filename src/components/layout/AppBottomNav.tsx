import { Link, useLocation } from "react-router-dom";
import { Home, Users, ClipboardList, Radio, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useSidebar } from "@/hooks/useSidebar";
import "./MobileBottomNav.css";

const items = [
  { to: "/dashboard", label: "Início", Icon: Home, match: (p: string) => p === "/dashboard" || p === "/dashboard/" },
  { to: "/dashboard/players", label: "Atletas", Icon: Users, match: (p: string) => p.startsWith("/dashboard/players") },
  { to: "/dashboard/reports", label: "Relatórios", Icon: ClipboardList, match: (p: string) => p.startsWith("/dashboard/reports") || p.startsWith("/dashboard/scouting") },
  { to: "/dashboard/live-match", label: "Ao Vivo", Icon: Radio, match: (p: string) => p.startsWith("/dashboard/live-match") },
  { to: "/dashboard/goals-monitor", label: "Metas", Icon: Target, match: (p: string) => p.startsWith("/dashboard/goals") },
];

export function AppBottomNav() {
  const location = useLocation();
  const { mobileMenuOpen } = useSidebar();
  const activeIdx = items.findIndex((i) => i.match(location.pathname));

  // Hide during active live match sessions — the action buttons need full screen height
  if (location.pathname.startsWith("/dashboard/live-match/")) return null;

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
