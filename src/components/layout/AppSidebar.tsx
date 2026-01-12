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
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const navItems = [
  { href: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/players", icon: Users, label: "Atletas" },
  { href: "/app/compare", icon: GitCompare, label: "Comparar" },
  { href: "/app/reports", icon: FileText, label: "Relatórios" },
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
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b border-zinc-800/50 bg-[hsl(222,47%,5%)]/95 backdrop-blur-sm flex items-center justify-between px-4">
        <Link to="/app" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white text-sm">
            M3
          </div>
          <span className="font-semibold text-white">M3 Agency</span>
        </Link>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={cn(
          "lg:hidden fixed top-16 left-0 right-0 z-40 bg-[hsl(222,47%,6%)] border-b border-zinc-800/50 transition-all duration-200",
          mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="p-3 space-y-1">
          {[...navItems, ...bottomNavItems].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-zinc-800/50 bg-[hsl(222,47%,5%)] transition-all duration-200",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/30">
          <Link to="/app" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-white text-sm">
              M3
            </div>
            {!isCollapsed && <span className="font-semibold text-white">M3 Agency</span>}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-zinc-800/50"
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isCollapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              )}
            >
              <item.icon className={cn(
                "w-[18px] h-[18px] shrink-0 transition-colors",
                isActive(item.href) ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-zinc-800/30 space-y-1">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              )}
            >
              <item.icon className={cn(
                "w-[18px] h-[18px] shrink-0 transition-colors",
                isActive(item.href) ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
          
          {!isCollapsed && user && (
            <div className="px-3 py-2 text-xs text-zinc-600 truncate">
              {user.email}
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/40 transition-colors group"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 text-zinc-600 group-hover:text-zinc-400" />
            {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
