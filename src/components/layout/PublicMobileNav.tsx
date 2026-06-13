import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Users, Newspaper, Mail } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/atletas", label: "Talentos", icon: Users },
  { href: "/imprensa", label: "Imprensa", icon: Newspaper },
  { href: "/contato", label: "Contato", icon: Mail },
];

export function PublicMobileNav() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div
        className="mx-3 mb-2 flex items-center justify-around rounded-2xl"
        style={{
          background: "rgba(17, 17, 17, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          minHeight: 56,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition-colors duration-150"
              style={{
                color: active ? "#ffffff" : "rgba(255,255,255,0.35)",
              }}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2 : 1.5} />
              <span
                style={{
                  fontFamily: '"Basis Grotesque Pro", sans-serif',
                  fontSize: 9,
                  fontWeight: active ? 600 : 400,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
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
