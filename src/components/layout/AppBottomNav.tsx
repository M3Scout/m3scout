import { Link, useLocation } from "react-router-dom";
import { Home, Users, Radio, Target } from "lucide-react";

const items = [
  { to: "/app", label: "INÍCIO", Icon: Home, match: (p: string) => p === "/app" || p === "/app/" },
  { to: "/app/athletes", label: "ATLETAS", Icon: Users, match: (p: string) => p.startsWith("/app/athletes") || p.startsWith("/app/players") },
  { to: "/app/live-match", label: "AO VIVO", Icon: Radio, match: (p: string) => p.startsWith("/app/live-match") },
  { to: "/app/market/targets", label: "METAS", Icon: Target, match: (p: string) => p.startsWith("/app/market") },
];

export function AppBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação rápida"
    >
      <div
        className="flex items-stretch justify-around"
        style={{
          background: "#111111",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {items.map((item) => {
          const isActive = item.match(location.pathname);
          const { Icon } = item;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5 transition-colors duration-200"
              style={{ color: isActive ? "#E5173F" : "rgba(255,255,255,0.45)" }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
