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
  LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, ModuleKey } from "@/hooks/usePermissions";
import { useSidebar } from "@/hooks/useSidebar";
import { toast } from "sonner";
import logoM3 from "@/assets/logo-m3.png";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============ SECTION COLOR SYSTEM ============
const SECTION_COLORS = {
  analysis: {
    accent: "#FF3B3B",
    activeBg: "rgba(255, 59, 59, 0.08)",
  },
  sports: {
    accent: "#22C55E",
    activeBg: "rgba(34, 197, 94, 0.08)",
  },
  business: {
    accent: "#3B82F6",
    activeBg: "rgba(59, 130, 246, 0.08)",
  },
  market: {
    accent: "#8B5CF6",
    activeBg: "rgba(139, 92, 246, 0.08)",
  },
  admin: {
    accent: "#F59E0B",
    activeBg: "rgba(245, 158, 11, 0.08)",
  },
} as const;

type SectionColorKey = keyof typeof SECTION_COLORS;

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  module: string;
  action?: string;
}

interface NavGroup {
  label: string;
  colorKey: SectionColorKey;
  items: NavItem[];
}

// ============ NAVIGATION STRUCTURE ============
const internalNavGroups: NavGroup[] = [
  {
    label: "Análise",
    colorKey: "analysis",
    items: [
      { href: "/app", icon: LayoutDashboard, label: "Dashboard", module: "app" },
      { href: "/app/players", icon: Users, label: "Atletas", module: "players" },
      { href: "/app/compare", icon: GitCompare, label: "Comparar", module: "compare" },
      { href: "/app/reports", icon: FileText, label: "Relatórios", module: "reports" },
    ]
  },
  {
    label: "Contexto Esportivo",
    colorKey: "sports",
    items: [
      { href: "/app/live-match", icon: Radio, label: "Jogo Ao Vivo", module: "live_match" },
      { href: "/app/competitions", icon: Trophy, label: "Competições", module: "competitions" },
    ]
  },
  {
    label: "Negócios",
    colorKey: "business",
    items: [
      { href: "/app/news", icon: Newspaper, label: "Notícias", module: "news" },
      { href: "/app/leads", icon: MessageSquare, label: "Leads", module: "leads" },
    ]
  },
  {
    label: "Mercado",
    colorKey: "market",
    items: [
      { href: "/app/market/ativos", icon: TrendingUp, label: "Ativos M3", module: "players" },
      { href: "/app/market/targets", icon: Users, label: "Targets", module: "players" },
      { href: "/app/contratos", icon: ScrollText, label: "Contratos", module: "players" },
    ]
  },
  {
    label: "Administração",
    colorKey: "admin",
    items: [
      { href: "/app/goals-monitor", icon: Target, label: "Metas", module: "users", action: "manage" },
      { href: "/app/settings/users", icon: Shield, label: "Usuários", module: "users", action: "manage" },
    ]
  }
];

const playerNavGroups: NavGroup[] = [
  {
    label: "Meu Espaço",
    colorKey: "analysis",
    items: [
      { href: "/app", icon: LayoutDashboard, label: "Dashboard", module: "app" },
      { href: "/app/my-profile", icon: Users, label: "Meu Perfil", module: "players" },
      { href: "/app/reports", icon: FileText, label: "Relatórios", module: "reports" },
    ]
  },
  {
    label: "Jogos",
    colorKey: "sports",
    items: [
      { href: "/app/live-match", icon: Radio, label: "Meus Jogos", module: "live_match" },
      { href: "/app/competitions", icon: Trophy, label: "Competições", module: "competitions" },
    ]
  }
];

// ============ MEMOIZED SIDEBAR ITEM ============
interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  accentColor: string;
  activeBg: string;
  collapsed: boolean;
}

const SidebarItem = memo(function SidebarItem({
  item,
  isActive,
  accentColor,
  activeBg,
  collapsed,
}: SidebarItemProps) {
  const content = (
    <Link
      to={item.href}
      className={cn(
        "group relative flex items-center rounded-md transition-all duration-100",
        collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-2.5 py-1.5",
        isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
      )}
      style={{
        background: isActive ? activeBg : undefined,
        borderLeft: isActive && !collapsed ? `3px solid ${accentColor}` : "3px solid transparent",
      }}
    >
      <item.icon
        className={cn(
          "shrink-0 transition-colors duration-100",
          collapsed ? "w-[18px] h-[18px]" : "w-[16px] h-[16px]"
        )}
        style={{ color: isActive ? accentColor : undefined }}
        strokeWidth={1.5}
      />
      {!collapsed && (
        <span
          className={cn(
            "text-[14px] leading-[1.2] font-medium tracking-tight truncate",
            isActive && "text-white"
          )}
        >
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
});

// ============ MEMOIZED SIDEBAR SECTION ============
interface SidebarSectionProps {
  group: NavGroup;
  currentPath: string;
  collapsed: boolean;
  can: (module: ModuleKey, action: string) => boolean;
}

const SidebarSection = memo(function SidebarSection({
  group,
  currentPath,
  collapsed,
  can,
}: SidebarSectionProps) {
  const colors = SECTION_COLORS[group.colorKey];
  
  // Filter items by permission
  const visibleItems = useMemo(() => 
    group.items.filter(item => {
      if (!item.module || item.module === "app") return true;
      const action = item.action || "view";
      return can(item.module as ModuleKey, action);
    }),
    [group.items, can]
  );

  if (visibleItems.length === 0) return null;

  const isActive = (href: string) => {
    if (href === "/app") return currentPath === "/app";
    return currentPath.startsWith(href);
  };

  return (
    <div className="space-y-0.5">
      {/* Section label - hide when collapsed */}
      {!collapsed && (
        <div
          className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: colors.accent, opacity: 0.7 }}
        >
          {group.label}
        </div>
      )}
      {/* Items */}
      {visibleItems.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          accentColor={colors.accent}
          activeBg={colors.activeBg}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
});

// ============ MOBILE NAV ITEM ============
interface MobileNavItemProps {
  item: NavItem;
  isActive: boolean;
  accentColor: string;
  activeBg: string;
  onClick: () => void;
}

const MobileNavItem = memo(function MobileNavItem({
  item,
  isActive,
  accentColor,
  activeBg,
  onClick,
}: MobileNavItemProps) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-100",
        "active:scale-[0.98]",
        isActive ? "text-white" : "text-zinc-400 active:bg-white/5"
      )}
      style={{
        background: isActive ? activeBg : undefined,
        borderLeft: isActive ? `3px solid ${accentColor}` : "3px solid transparent",
      }}
    >
      <item.icon
        className="w-5 h-5 shrink-0"
        style={{ color: isActive ? accentColor : undefined }}
        strokeWidth={1.5}
      />
      <span className={cn(
        "text-[14px] font-medium",
        isActive && "text-white"
      )}>
        {item.label}
      </span>
    </Link>
  );
});

// ============ MOBILE SECTION ============
interface MobileSectionProps {
  group: NavGroup;
  currentPath: string;
  can: (module: ModuleKey, action: string) => boolean;
  onNavigate: () => void;
}

const MobileSection = memo(function MobileSection({
  group,
  currentPath,
  can,
  onNavigate,
}: MobileSectionProps) {
  const colors = SECTION_COLORS[group.colorKey];
  
  const visibleItems = useMemo(() => 
    group.items.filter(item => {
      if (!item.module || item.module === "app") return true;
      const action = item.action || "view";
      return can(item.module as ModuleKey, action);
    }),
    [group.items, can]
  );

  if (visibleItems.length === 0) return null;

  const isActive = (href: string) => {
    if (href === "/app") return currentPath === "/app";
    return currentPath.startsWith(href);
  };

  return (
    <div className="space-y-0.5">
      <div
        className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: colors.accent, opacity: 0.8 }}
      >
        {group.label}
      </div>
      {visibleItems.map((item) => (
        <MobileNavItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          accentColor={colors.accent}
          activeBg={colors.activeBg}
          onClick={onNavigate}
        />
      ))}
    </div>
  );
});

// ============ MAIN SIDEBAR COMPONENT ============
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
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
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

  const handleLogout = useCallback(async () => {
    await signOut();
    toast.success("Você saiu do sistema");
    navigate("/app/auth");
  }, [signOut, navigate]);

  const handleMobileClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const showCollapsed = isCollapsed || isTablet;
  const currentPath = location.pathname;

  return (
    <>
      {/* ===== MOBILE HEADER (< 768px) ===== */}
      <header 
        className="md:hidden fixed left-0 right-0 z-50 h-14 border-b border-white/5 bg-gradient-to-b from-zinc-900/98 to-zinc-950/98 backdrop-blur-xl flex items-center justify-between"
        style={{ 
          top: 'var(--sat)',
          paddingLeft: 'calc(var(--sal) + 1rem)',
          paddingRight: 'calc(var(--sar) + 1rem)',
        }}
      >
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
        onClick={handleMobileClose}
      />

      {/* ===== MOBILE DRAWER ===== */}
      <nav
        className={cn(
          "md:hidden fixed left-0 bottom-0 z-50 w-[85%] max-w-[320px]",
          "border-r border-white/5 shadow-2xl shadow-black/50",
          "flex flex-col transition-transform duration-200 ease-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          top: 'var(--sat)',
          background: "linear-gradient(180deg, #0B0E14 0%, #080A10 100%)",
          paddingLeft: 'var(--sal)',
          paddingBottom: 'var(--sab)',
        }}
      >
        {/* Drawer Header */}
        <div className="shrink-0 border-b border-white/5">
          <div className="h-14 flex items-center justify-between px-4">
            <Link to="/" className="flex items-center" onClick={handleMobileClose}>
              <img src={logoM3} alt="M3 Agency" className="h-7 w-auto" />
            </Link>
            <button
              onClick={handleMobileClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 active:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Drawer Content - Scrollable on mobile */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-3">
          {navGroups.map((group) => (
            <MobileSection
              key={group.label}
              group={group}
              currentPath={currentPath}
              can={can}
              onNavigate={handleMobileClose}
            />
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="px-3 py-3 border-t border-white/5 space-y-0.5 shrink-0">
          <Link
            to="/app/settings"
            onClick={handleMobileClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 active:bg-white/5 transition-all"
          >
            <Settings className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[14px] font-medium">Configurações</span>
          </Link>

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-2" />

          {user && (
            <div className="px-4 py-2 text-[11px] text-zinc-600 truncate">
              {user.email}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-zinc-500 active:bg-white/5 active:scale-[0.98] transition-all duration-150"
          >
            <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            <span className="text-[14px] font-medium">Sair</span>
          </button>
        </div>
      </nav>

      {/* ===== TABLET/DESKTOP SIDEBAR (>= 768px) ===== */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 z-40 transition-all duration-200 ease-out",
          "border-r border-white/[0.04] sidebar-compact-height",
          "h-[100dvh] min-h-screen", // Use dvh with vh fallback for proper height
          showCollapsed ? "w-[64px]" : "w-56"
        )}
        style={{
          background: "linear-gradient(180deg, #0B0E14 0%, #080A10 100%)",
        }}
      >
        {/* ===== HEADER ===== */}
        <div className="shrink-0 border-b border-white/[0.04]">
          <div
            className={cn(
              "sidebar-header-main h-14 flex items-center transition-all duration-200",
              showCollapsed ? "justify-center px-2" : "justify-between px-3"
            )}
          >
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
                  showCollapsed ? "h-6 max-w-[40px]" : "h-7"
                )}
              />
            </Link>
            {/* Toggle + Bell when expanded */}
            {!showCollapsed && (
              <div className="flex items-center gap-0.5">
                <NotificationBell />
                {!isTablet && (
                  <button
                    onClick={toggleCollapsed}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-100"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bell + Expand when collapsed */}
          {showCollapsed && (
            <div className="sidebar-collapsed-controls flex flex-col items-center gap-1 py-2">
              <NotificationBell />
              <button
                onClick={toggleCollapsed}
                className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-100"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* ===== NAVIGATION - SCROLLABLE ===== */}
        <nav className="flex-1 min-h-0 px-2 py-2 space-y-2 overflow-y-auto overflow-x-hidden sidebar-nav-scroll">
          <TooltipProvider delayDuration={0}>
            {navGroups.map((group) => (
              <SidebarSection
                key={group.label}
                group={group}
                currentPath={currentPath}
                collapsed={showCollapsed}
                can={can}
              />
            ))}
          </TooltipProvider>
        </nav>

        {/* ===== FOOTER - Always visible ===== */}
        <div className="sidebar-footer px-2 py-2 border-t border-white/[0.04] space-y-0.5 shrink-0 mt-auto">
          <TooltipProvider delayDuration={0}>
            {/* Settings */}
            {showCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/app/settings"
                    className="flex items-center justify-center px-2 py-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-100"
                  >
                    <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs font-medium"
                >
                  Configurações
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/app/settings"
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-zinc-500 hover:text-zinc-200 transition-all duration-100",
                  currentPath.startsWith("/app/settings") &&
                    "text-white bg-white/5"
                )}
              >
                <Settings className="w-[16px] h-[16px]" strokeWidth={1.5} />
                <span className="text-[14px] font-medium">Configurações</span>
              </Link>
            )}

            {/* User email - only when expanded */}
            {!showCollapsed && user && (
              <div className="px-2.5 py-1 text-[10px] text-zinc-600 truncate">
                {user.email}
              </div>
            )}

            {/* Logout */}
            {showCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full px-2 py-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-100"
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
                className="flex items-center gap-2.5 px-2.5 py-1.5 w-full rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-100"
              >
                <LogOut className="w-[16px] h-[16px]" strokeWidth={1.5} />
                <span className="text-[14px] font-medium">Sair</span>
              </button>
            )}
          </TooltipProvider>
        </div>
      </aside>
    </>
  );
}
