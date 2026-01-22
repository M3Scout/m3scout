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
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, ModuleKey } from "@/hooks/usePermissions";
import { useSidebar } from "@/hooks/useSidebar";
import { toast } from "sonner";
import logoM3 from "@/assets/logo-m3.png";
import logoM3Icon from "@/assets/logo-m3-icon.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Grouped navigation structure
const navGroups = [
  {
    label: "Análise",
    items: [
      { href: "/app", icon: LayoutDashboard, label: "Dashboard", module: "app" as const },
      { href: "/app/players", icon: Users, label: "Atletas", module: "players" as const },
      { href: "/app/compare", icon: GitCompare, label: "Comparar", module: "compare" as const },
      { href: "/app/reports", icon: FileText, label: "Relatórios", module: "reports" as const },
    ]
  },
  {
    label: "Contexto Esportivo",
    items: [
      { href: "/app/live-match", icon: Radio, label: "Jogo Ao Vivo", module: "live_match" as const },
      { href: "/app/competitions", icon: Trophy, label: "Competições", module: "competitions" as const },
    ]
  },
  {
    label: "Negócios",
    items: [
      { href: "/app/news", icon: Newspaper, label: "Notícias", module: "news" as const },
      { href: "/app/leads", icon: MessageSquare, label: "Leads", module: "leads" as const },
    ]
  }
];

const bottomNavItems = [
  { href: "/app/settings", icon: Settings, label: "Configurações", module: null },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { can } = usePermissions();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter nav items based on permissions
  const visibleNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.module) return true;
      return can(item.module as ModuleKey, "view");
    })
  })).filter(group => group.items.length > 0);

  const allVisibleItems = visibleNavGroups.flatMap(g => g.items);

  const isActive = (href: string) => {
    if (href === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu do sistema");
    navigate("/app/auth");
  };

  // Render a single nav item
  const NavItem = ({ 
    item, 
    collapsed = false,
    onClick
  }: { 
    item: typeof allVisibleItems[0]; 
    collapsed?: boolean;
    onClick?: () => void;
  }) => {
    const active = isActive(item.href);
    
    const content = (
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg transition-all duration-150",
          collapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2.5",
          active
            ? "bg-gradient-to-r from-primary/12 to-primary/6 text-white"
            : "text-zinc-400 hover:text-zinc-100 hover:translate-x-0.5"
        )}
      >
        {/* Active indicator - thin left border */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-full" />
        )}
        
        <item.icon 
          className={cn(
            "w-[18px] h-[18px] shrink-0 transition-colors duration-150",
            active ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"
          )} 
          strokeWidth={1.5}
        />
        
        {!collapsed && (
          <span className={cn(
            "text-[13px] tracking-wide transition-colors duration-150",
            active ? "font-medium" : "font-normal"
          )}>
            {item.label}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={12}
            className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/5 bg-gradient-to-b from-zinc-900/98 to-zinc-950/98 backdrop-blur-xl flex items-center justify-between px-4">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img src={logoM3} alt="M3 Agency" className="h-7 w-auto" />
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
        </button>
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
          "lg:hidden fixed top-14 left-0 right-0 z-40 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-white/5 transition-all duration-200",
          mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="p-3 space-y-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem 
                    key={item.href} 
                    item={item} 
                    onClick={() => setMobileMenuOpen(false)} 
                  />
                ))}
              </div>
            </div>
          ))}
          
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          {/* Bottom items */}
          <div className="space-y-0.5">
            {bottomNavItems.map((item) => (
              <NavItem 
                key={item.href} 
                item={item} 
                onClick={() => setMobileMenuOpen(false)} 
              />
            ))}
            
            {can("users", "manage") && (
              <Link
                to="/app/settings/users"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                  isActive("/app/settings/users")
                    ? "bg-gradient-to-r from-primary/12 to-primary/6 text-white"
                    : "text-zinc-400 hover:text-zinc-100 hover:translate-x-0.5"
                )}
              >
                {isActive("/app/settings/users") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-full" />
                )}
                <Shield className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                <span className="text-[13px] tracking-wide">Usuários</span>
              </Link>
            )}
          </div>
          
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-zinc-500 hover:text-zinc-200 hover:translate-x-0.5 transition-all duration-150"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
            <span className="text-[13px] tracking-wide">Sair</span>
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-200 ease-out",
          "bg-gradient-to-b from-[hsl(225,35%,6%)] via-[hsl(225,40%,5%)] to-[hsl(225,45%,4%)]",
          "border-r border-white/[0.04]",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.04]">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
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
          {!isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Collapse trigger when collapsed */}
        {isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="mx-auto mt-3 w-8 h-8 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-150"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" strokeWidth={1.5} />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          <TooltipProvider delayDuration={0}>
            {visibleNavGroups.map((group) => (
              <div key={group.label}>
                {!isCollapsed && (
                  <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem 
                      key={item.href} 
                      item={item} 
                      collapsed={isCollapsed} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </nav>

        {/* Bottom Section */}
        <div className="px-3 py-4 border-t border-white/[0.04] space-y-1">
          <TooltipProvider delayDuration={0}>
            {bottomNavItems.map((item) => (
              <NavItem 
                key={item.href} 
                item={item} 
                collapsed={isCollapsed} 
              />
            ))}

            {/* User Management - Admin Only */}
            {can("users", "manage") && (
              <>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/app/settings/users"
                        className={cn(
                          "group relative flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                          isActive("/app/settings/users")
                            ? "bg-gradient-to-r from-primary/12 to-primary/6 text-white"
                            : "text-zinc-400 hover:text-zinc-100"
                        )}
                      >
                        {isActive("/app/settings/users") && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-full" />
                        )}
                        <Shield className="w-[18px] h-[18px]" strokeWidth={1.5} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      sideOffset={12}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
                    >
                      Usuários & Permissões
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    to="/app/settings/users"
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                      isActive("/app/settings/users")
                        ? "bg-gradient-to-r from-primary/12 to-primary/6 text-white"
                        : "text-zinc-400 hover:text-zinc-100 hover:translate-x-0.5"
                    )}
                  >
                    {isActive("/app/settings/users") && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-full" />
                    )}
                    <Shield className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    <span className="text-[13px] tracking-wide">Usuários</span>
                  </Link>
                )}
              </>
            )}
            
            {/* User email */}
            {!isCollapsed && user && (
              <div className="px-3 py-2 text-[11px] text-zinc-600 truncate">
                {user.email}
              </div>
            )}
            
            {/* Logout */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-150"
                  >
                    <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  sideOffset={12}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs"
                >
                  Sair
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-zinc-500 hover:text-zinc-200 hover:translate-x-0.5 hover:bg-white/5 transition-all duration-150"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span className="text-[13px] tracking-wide">Sair</span>
              </button>
            )}
          </TooltipProvider>
        </div>
      </aside>
    </>
  );
}
