import { Link, useLocation } from "react-router-dom";
import { Home, Users, Newspaper, Info, Mail } from "lucide-react";
import { motion } from "framer-motion";
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
  const activeIdx = items.findIndex((i) => i.match(location.pathname));

  return (
    <nav className="m3-bottom-nav" aria-label="Navegação principal">
      <div className="m3-bottom-nav__inner">
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
                  layoutId="m3-bottom-nav-pill"
                  className="m3-bottom-nav__pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="m3-bottom-nav__content">
                <Icon size={22} strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
