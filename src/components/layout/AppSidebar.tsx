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
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  MessageSquare,
  GitCompare,
  Newspaper,
  Radio,
  Shield,
  TrendingUp,
  Target,
  ScrollText,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, ModuleKey } from "@/hooks/usePermissions";
import { useSidebar } from "@/hooks/useSidebar";
import { useSidebarSections } from "@/hooks/useSidebarSections";
import { toast } from "sonner";
import logoM3 from "@/assets/logo-m3.png";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SidebarSearch } from "@/components/layout/SidebarSearch";
import { SidebarGroupPopover } from "@/components/layout/SidebarGroupPopover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Navigation groups for internal users (admin/scout/editor/viewer)
const internalNavGroups = [
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
  },
  {
    label: "Mercado",
    items: [
      { href: "/app/market/ativos", icon: TrendingUp, label: "Ativos M3", module: "players" as const },
      { href: "/app/market/targets", icon: Users, label: "Targets", module: "players" as const },
      { href: "/app/contratos", icon: ScrollText, label: "Contratos", module: "players" as const },
    ]
  },
  {
    label: "Administração",
    items: [
      { href: "/app/goals-monitor", icon: Target, label: "Metas (Monitor)", module: "users" as const, action: "manage" as const },
      { href: "/app/settings/users", icon: Shield, label: "Usuários", module: "users" as const, action: "manage" as const },
    ]
  }
];

// Simplified navigation for player role (self-scoped, read-only)
const playerNavGroups = [
  {
    label: "Meu Espaço",
    items: [
      { href: "/app", icon: LayoutDashboard, label: "Dashboard", module: "app" as const },
      { href: "/app/my-profile", icon: Users, label: "Meu Perfil", module: "players" as const },
      { href: "/app/reports", icon: FileText, label: "Meus Relatórios", module: "reports" as const },
    ]
  },
  {
    label: "Jogos",
    items: [
      { href: "/app/live-match", icon: Radio, label: "Meus Jogos", module: "live_match" as const },
      { href: "/app/competitions", icon: Trophy, label: "Competições", module: "competitions" as const },
    ]
  }
];

const bottomNavItems = [
  { href: "/app/settings", icon: Settings, label: "Configurações", module: null },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isPlayer } = useAuth();
  const { can, isPlayerRole } = usePermissions();
  const { isCollapsed, toggleCollapsed, setIsCollapsed } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Detect tablet breakpoint
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet) {
      setIsCollapsed(true);
    }
  }, [isTablet, setIsCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Choose navigation groups based on user role
  const navGroups = isPlayerRole ? playerNavGroups : internalNavGroups;

  // Filter nav items based on permissions
  const visibleNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.module) return true;
      const action = (item as any).action || "view";
      return can(item.module as ModuleKey, action);
    })
  })).filter(group => group.items.length > 0);

  const allVisibleItems = useMemo(() => 
    visibleNavGroups.flatMap(g => g.items),
    [visibleNavGroups]
  );

  const isActive = (href: string) => {
    if (href === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(href);
  };

  // Determine which group is active based on current route
  const activeGroupLabel = useMemo(() => {
    for (const group of visibleNavGroups) {
      for (const item of group.items) {
        if (isActive(item.href)) {
          return group.label;
        }
      }
    }
    return undefined;
  }, [location.pathname, visibleNavGroups]);

  // Section state with persistence
  const { isSectionOpen, toggleSection } = useSidebarSections(
    visibleNavGroups.map(g => g.label),
    activeGroupLabel
  );

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu do sistema");
    navigate("/app/auth");
  };

  const showCollapsed = isCollapsed || isTablet;

  // Render nav item for desktop/tablet
  const NavItemDesktop = ({ 
    item, 
    collapsed = false,
  }: { 
    item: typeof allVisibleItems[0]; 
    collapsed?: boolean;
  }) => {
    const active = isActive(item.href);
    
    const content = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg transition-all duration-150",
          collapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2",
          active
            ? "bg-gradient-to-r from-primary/12 to-primary/6 text-white"
            : "text-zinc-400 hover:text-zinc-100 hover:translate-x-0.5"
        )}
      >
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
            className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs font-medium"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  // Render nav item for mobile drawer
  const NavItemMobile = ({ 
    item, 
    onClick
  }: { 
    item: typeof allVisibleItems[0]; 
    onClick?: () => void;
  }) => {
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150",
          "active:scale-[0.98]",
          active
            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-white"
            : "text-zinc-400 active:bg-white/5"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-full" />
        )}
        
        <item.icon 
          className={cn(
            "w-5 h-5 shrink-0 transition-colors duration-150",
            active ? "text-primary" : "text-zinc-500"
          )} 
          strokeWidth={1.5}
        />
        
        <span className={cn(
          "text-[14px] tracking-wide transition-colors duration-150",
          active ? "font-medium" : "font-normal"
        )}>
          {item.label}
        </span>
      </Link>
    );
  };

  // Collapsible group for expanded sidebar
  const CollapsibleGroup = ({ group }: { group: typeof visibleNavGroups[0] }) => {
    const isGroupActive = group.label === activeGroupLabel;
    const isOpen = isSectionOpen(group.label);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(group.label)}>
        <CollapsibleTrigger className="w-full group">
          <div className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150",
            isGroupActive 
              ? "text-zinc-200" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
          )}>
            <span className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              isGroupActive && "text-primary/80"
            )}>
              {group.label}
            </span>
            <ChevronDown 
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
              strokeWidth={2}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pt-1 space-y-0.5">
            {group.items.map((item) => (
              <NavItemDesktop 
                key={item.href} 
                item={item} 
                collapsed={false} 
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Mobile collapsible group
  const MobileCollapsibleGroup = ({ group }: { group: typeof visibleNavGroups[0] }) => {
    const isGroupActive = group.label === activeGroupLabel;
    const isOpen = isSectionOpen(group.label);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(group.label)}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between px-4 py-2.5 rounded-lg",
            isGroupActive 
              ? "text-zinc-200" 
              : "text-zinc-500"
          )}>
            <span className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              isGroupActive && "text-primary/80"
            )}>
              {group.label}
            </span>
            <ChevronDown 
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
              strokeWidth={2}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pt-1 space-y-0.5">
            {group.items.map((item) => (
              <NavItemMobile 
                key={item.href} 
                item={item} 
                onClick={() => setMobileMenuOpen(false)} 
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <>
      {/* ===== MOBILE HEADER (< 768px) ===== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/5 bg-gradient-to-b from-zinc-900/98 to-zinc-950/98 backdrop-blur-xl flex items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <img src={logoM3} alt="M3 Agency" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150",
              mobileMenuOpen 
                ? "bg-primary/10 text-primary" 
                : "text-zinc-400 active:bg-white/5"
            )}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" strokeWidth={1.5} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </header>

      {/* ===== MOBILE DRAWER BACKDROP ===== */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ===== MOBILE DRAWER (85% width from left) ===== */}
      <nav
        className={cn(
          "md:hidden fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-[320px]",
          "bg-gradient-to-b from-[hsl(225,35%,7%)] via-[hsl(225,40%,5%)] to-[hsl(225,45%,4%)]",
          "border-r border-white/5 shadow-2xl shadow-black/50",
          "flex flex-col transition-transform duration-200 ease-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header - STICKY */}
        <div className="shrink-0 border-b border-white/5">
          <div className="h-14 flex items-center justify-between px-4">
            <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
              <img src={logoM3} alt="M3 Agency" className="h-7 w-auto" />
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 active:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
          {/* Search in mobile */}
          <div className="px-3 pb-3">
            <SidebarSearch 
              items={allVisibleItems} 
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>

        {/* Drawer Content - SCROLLABLE */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-3">
          {visibleNavGroups.map((group) => (
            <MobileCollapsibleGroup key={group.label} group={group} />
          ))}
        </div>

        {/* Drawer Footer - STICKY */}
        <div className="px-3 py-4 border-t border-white/5 space-y-0.5 shrink-0">
          {bottomNavItems.map((item) => (
            <NavItemMobile 
              key={item.href} 
              item={item} 
              onClick={() => setMobileMenuOpen(false)} 
            />
          ))}

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-2" />

          {user && (
            <div className="px-4 py-2 text-[11px] text-zinc-600 truncate">
              {user.email}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-3 w-full rounded-xl text-zinc-500 active:bg-white/5 active:scale-[0.98] transition-all duration-150"
          >
            <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            <span className="text-[14px] tracking-wide">Sair</span>
          </button>
        </div>
      </nav>

      {/* ===== TABLET/DESKTOP SIDEBAR (>= 768px) ===== */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-200 ease-out",
          "bg-gradient-to-b from-[hsl(225,35%,6%)] via-[hsl(225,40%,5%)] to-[hsl(225,45%,4%)]",
          "border-r border-white/[0.04]",
          showCollapsed ? "w-[72px]" : "w-60"
        )}
      >
        {/* ===== STICKY HEADER ===== */}
        <div className="shrink-0 border-b border-white/[0.04] flex flex-col">
          {/* SidebarHeader - Logo only with fixed height */}
          <div className={cn(
            "h-16 flex items-center overflow-hidden transition-all duration-200",
            showCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            <Link 
              to="/" 
              className={cn(
                "flex items-center hover:opacity-80 transition-all duration-200",
                showCollapsed && "justify-center"
              )}
            >
              <img 
                src={logoM3} 
                alt="M3 Agency" 
                className={cn(
                  "w-auto object-contain transition-all duration-200",
                  showCollapsed ? "h-6 max-w-[48px]" : "h-8"
                )}
              />
            </Link>
            {/* Toggle button only when expanded */}
            {!isTablet && !isCollapsed && (
              <button
                onClick={toggleCollapsed}
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-150"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* SidebarTopActions - Notification bell in separate row */}
          <div className={cn(
            "flex mt-1 mb-2 transition-all duration-200",
            showCollapsed ? "justify-center px-2" : "justify-start px-4"
          )}>
            <NotificationBell />
          </div>

          {/* Search when expanded */}
          {!showCollapsed && (
            <div className="px-3 pb-3">
              <SidebarSearch items={allVisibleItems} />
            </div>
          )}

          {/* Expand button when collapsed */}
          {showCollapsed && (
            <div className="py-2 flex justify-center">
              <button
                onClick={toggleCollapsed}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-150"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* ===== SCROLLABLE NAVIGATION ===== */}
        <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
          <TooltipProvider delayDuration={0}>
            {showCollapsed ? (
              // Collapsed mode: show group popovers
              visibleNavGroups.map((group) => {
                const isGroupActive = group.label === activeGroupLabel;
                return (
                  <div key={group.label} className="space-y-1">
                    <SidebarGroupPopover 
                      label={group.label}
                      items={group.items}
                      isActive={isGroupActive}
                    />
                  </div>
                );
              })
            ) : (
              // Expanded mode: show collapsible groups
              visibleNavGroups.map((group) => (
                <CollapsibleGroup key={group.label} group={group} />
              ))
            )}
          </TooltipProvider>
        </nav>

        {/* ===== STICKY FOOTER ===== */}
        <div className="px-3 py-3 border-t border-white/[0.04] space-y-1 shrink-0">
          <TooltipProvider delayDuration={0}>
            {bottomNavItems.map((item) => (
              <NavItemDesktop 
                key={item.href} 
                item={item} 
                collapsed={showCollapsed} 
              />
            ))}

            {/* User email - only when expanded on desktop */}
            {!showCollapsed && user && (
              <div className="px-3 py-2 text-[11px] text-zinc-600 truncate">
                {user.email}
              </div>
            )}
            
            {/* Logout */}
            {showCollapsed ? (
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
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs font-medium"
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
