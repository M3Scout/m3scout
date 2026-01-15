import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Trophy,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  MessageSquare,
  GitCompare,
  Newspaper,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logoM3 from "@/assets/logo-m3.png";
import logoM3Icon from "@/assets/logo-m3-icon.png";

const navItems = [
  { href: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/players", icon: Users, label: "Atletas" },
  { href: "/app/compare", icon: GitCompare, label: "Comparar" },
  { href: "/app/reports", icon: FileText, label: "Relatórios" },
  { href: "/app/live-match", icon: Radio, label: "Jogo Ao Vivo" },
  { href: "/app/competitions", icon: Trophy, label: "Competições" },
  { href: "/app/news", icon: Newspaper, label: "Notícias" },
  { href: "/app/leads", icon: MessageSquare, label: "Leads" },
];

const bottomNavItems = [
  { href: "/app/settings", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu do sistema");
    navigate("/app/auth");
  };

  return (
    <>
      {/* Mobile Header - Minimal */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-zinc-800/30 bg-[hsl(222,47%,4%)]/98 backdrop-blur-md flex items-center justify-between px-4">
        <Link to="/app" className="flex items-center">
          <img src={logoM3} alt="M3 Agency" className="h-7 w-auto" />
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu - Command Center Style */}
      <nav
        className={cn(
          "lg:hidden fixed top-14 left-0 right-0 z-40 bg-[hsl(222,47%,5%)] border-b border-zinc-800/30 transition-all duration-150",
          mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        )}
      >
        <div className="p-2 space-y-0.5">
          {[...navItems, ...bottomNavItems].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-100",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40 active:bg-zinc-800/60"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 shrink-0",
                isActive(item.href) ? "text-primary" : ""
              )} />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
          <div className="h-px bg-zinc-800/40 my-1.5" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/40 active:bg-zinc-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar - Professional Command Center */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-zinc-800/30 bg-[hsl(222,47%,4%)] transition-all duration-150",
          isCollapsed ? "w-[60px]" : "w-56"
        )}
      >
        {/* Logo Section */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800/20">
          <Link to="/app" className="flex items-center">
            {isCollapsed ? (
              <img 
                src={logoM3Icon} 
                alt="M3 Agency" 
                className="h-8 w-8 rounded-lg"
              />
            ) : (
              <img 
                src={logoM3} 
                alt="M3 Agency" 
                className="h-8 w-auto"
              />
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors rounded",
              isCollapsed && "mx-auto"
            )}
          >
            <ChevronLeft
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-150",
                isCollapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation - Clean and focused */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-100 group relative",
                isActive(item.href)
                  ? "bg-primary/15 text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 active:bg-zinc-800/60"
              )}
            >
              {/* Active indicator */}
              {isActive(item.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r" />
              )}
              <item.icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                isActive(item.href) ? "text-primary" : "text-zinc-600 group-hover:text-zinc-400"
              )} />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm transition-colors",
                  isActive(item.href) ? "font-medium" : ""
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom Section - Subtle */}
        <div className="p-2 border-t border-zinc-800/20 space-y-0.5">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-100 group relative",
                isActive(item.href)
                  ? "bg-primary/15 text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 active:bg-zinc-800/60"
              )}
            >
              {isActive(item.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r" />
              )}
              <item.icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                isActive(item.href) ? "text-primary" : "text-zinc-600 group-hover:text-zinc-400"
              )} />
              {!isCollapsed && (
                <span className={cn(
                  "text-sm transition-colors",
                  isActive(item.href) ? "font-medium" : ""
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          ))}
          
          {/* User email - very subtle */}
          {!isCollapsed && user && (
            <div className="px-2.5 py-1.5 text-[10px] text-zinc-700 truncate">
              {user.email}
            </div>
          )}
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 active:bg-zinc-800/60 transition-all duration-100 group"
          >
            <LogOut className="w-4 h-4 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
            {!isCollapsed && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}