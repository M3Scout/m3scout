import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  GitCompare,
  FileText,
  Radio,
  Trophy,
  Newspaper,
  Target,
  Briefcase,
  Crosshair,
  ScrollText,
  Goal,
  UserCog,
  User,
  Gamepad2,
  ClipboardList,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, memo } from "react";
import { useAuth } from "@/hooks/authContext";
import { usePermissions, ModuleKey } from "@/hooks/usePermissions";
import { useSidebar } from "@/hooks/useSidebar";
import logoM3 from "@/assets/logo-m3.png";
import { hardLogoutToAuth } from "@/lib/hardLogout";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  module: string;
  action?: string;
  icon: LucideIcon;
  hiddenOnMobile?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ============ NAVIGATION STRUCTURE ============
const internalNavGroups: NavGroup[] = [
  {
    label: "Análise",
    items: [
      { href: "/dashboard", label: "Dashboard", module: "app", icon: LayoutDashboard },
      { href: "/dashboard/atletas", label: "Atletas", module: "players", icon: Users },
      { href: "/dashboard/comparar",   label: "Comparar",  module: "compare", icon: GitCompare },
      { href: "/dashboard/prancheta", label: "Prancheta", module: "players", icon: ClipboardList, hiddenOnMobile: true },
      { href: "/dashboard/relatorios", label: "Relatórios", module: "reports", icon: FileText },
    ]
  },
  {
    label: "Contexto Esportivo",
    items: [
      { href: "/dashboard/aovivo", label: "Jogo Ao Vivo", module: "live_match", icon: Radio },
      { href: "/dashboard/competicoes", label: "Competições", module: "competitions", icon: Trophy },
      { href: "/dashboard/laboratorio", label: "Lab. Tático", module: "players", icon: FlaskConical },
    ]
  },
  {
    label: "Negócios",
    items: [
      { href: "/dashboard/noticias", label: "Notícias", module: "news", icon: Newspaper },
    ]
  },
  {
    label: "Mercado",
    items: [
      { href: "/dashboard/ativos", label: "Ativos M3", module: "players", icon: Briefcase },
      { href: "/dashboard/monitoramento", label: "Targets", module: "players", icon: Crosshair },
      { href: "/dashboard/contratos", label: "Contratos", module: "players", icon: ScrollText },
    ]
  },
  {
    label: "Administração",
    items: [
      { href: "/dashboard/metas", label: "Metas", module: "users", action: "manage", icon: Goal },
      { href: "/dashboard/usuarios", label: "Usuários", module: "users", action: "manage", icon: UserCog },
    ]
  }
];

const playerNavGroups: NavGroup[] = [
  {
    label: "Meu Espaço",
    items: [
      { href: "/dashboard", label: "Dashboard", module: "app", icon: LayoutDashboard },
      { href: "/dashboard/my-profile", label: "Meu Perfil", module: "players", icon: User },
      { href: "/dashboard/minhas-metas", label: "Metas", module: "app", icon: Target },
      { href: "/dashboard/meus-contratos", label: "Contratos", module: "app", icon: ScrollText },
      { href: "/dashboard/relatorios", label: "Relatórios", module: "reports", icon: FileText },
    ]
  },
  {
    label: "Jogos",
    items: [
      { href: "/dashboard/aovivo", label: "Meus Jogos", module: "live_match", icon: Gamepad2 },
      { href: "/dashboard/competicoes", label: "Competições", module: "competitions", icon: Trophy },
      { href: "/dashboard/laboratorio", label: "Lab. Tático", module: "app", icon: FlaskConical },
    ]
  }
];

// ============ MEMOIZED SIDEBAR ITEM ============
interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

const SidebarItem = memo(function SidebarItem({
  item,
  isActive,
  collapsed,
}: SidebarItemProps) {
  const Icon = item.icon;
  const content = (
    <Link
      to={item.href}
      className={cn(
        "group relative flex items-center transition-all duration-100",
        collapsed ? "justify-center px-2 py-2 rounded-md" : "gap-2.5 pr-2.5 py-1.5",
        isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
      )}
      style={{
        background: isActive ? "rgba(230, 57, 70, 0.08)" : undefined,
        borderLeft: isActive && !collapsed ? "3px solid #e63946" : collapsed ? undefined : "3px solid transparent",
        paddingLeft: collapsed ? undefined : isActive ? "9px" : "9px",
      }}
    >
      <Icon
        className={cn(
          "shrink-0 transition-colors duration-100",
          collapsed ? "w-[18px] h-[18px]" : "w-4 h-4",
          isActive ? "text-[#e63946]" : "text-current opacity-60"
        )}
        strokeWidth={1.5}
      />
      {!collapsed && (
        <span
          className={cn(
            "text-[14px] leading-[1.2] font-medium tracking-tight truncate",
            isActive ? "text-white" : ""
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
    if (href === "/dashboard") return currentPath === "/dashboard";
    return currentPath.startsWith(href);
  };

  return (
    <div className="space-y-0.5 first:mt-0 [&:not(:first-child)]:mt-6">
      {!collapsed && (
        <div
          className="pl-3 pr-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "#666666" }}
        >
          {group.label}
        </div>
      )}
      {visibleItems.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
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
  onClick: () => void;
}

const MobileNavItem = memo(function MobileNavItem({
  item,
  isActive,
  onClick,
}: MobileNavItemProps) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-2.5 transition-all duration-100",
        "active:scale-[0.98]",
        isActive ? "" : "text-zinc-400 active:bg-white/5"
      )}
      style={{
        borderRadius: 8,
        background: isActive ? "rgba(230, 57, 70, 0.10)" : undefined,
      }}
    >
      {/* Left indicator bar */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full"
          style={{ height: "60%", background: "#e63946" }}
        />
      )}
      <Icon
        className={cn(
          "w-4 h-4 shrink-0 transition-colors duration-100",
          isActive ? "text-[#e63946]" : "text-current opacity-60"
        )}
        strokeWidth={1.5}
      />
      <span className={cn(
        "text-[14px] font-medium",
        isActive ? "text-[#e63946]" : ""
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
  const visibleItems = useMemo(() =>
    group.items.filter(item => {
      if (item.hiddenOnMobile) return false;
      if (!item.module || item.module === "app") return true;
      const action = item.action || "view";
      return can(item.module as ModuleKey, action);
    }),
    [group.items, can]
  );

  if (visibleItems.length === 0) return null;

  const isActive = (href: string) => {
    if (href === "/dashboard") return currentPath === "/dashboard";
    return currentPath.startsWith(href);
  };

  return (
    <div className="space-y-0.5 first:mt-0 [&:not(:first-child)]:mt-6">
      <div
        className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "#666666" }}
      >
        {group.label}
      </div>
      {visibleItems.map((item) => (
        <MobileNavItem
          key={item.href}
          item={item}
          isActive={isActive(item.href)}
          onClick={onNavigate}
        />
      ))}
    </div>
  );
});

// ============ MAIN SIDEBAR COMPONENT ============
export function AppSidebar() {
  const location = useLocation();
  const { user, isPlayer } = useAuth();
  const { can, isPlayerRole } = usePermissions();
  const { isCollapsed, toggleCollapsed, setIsCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebar();
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

  const handleMobileClose = () => setMobileMenuOpen(false);

  const showCollapsed = isCollapsed || isTablet;
  const currentPath = location.pathname;

  return (
    <>
      {/* ===== MOBILE HEADER (< 768px) ===== */}
      <header
        className="md:hidden fixed left-0 right-0 z-[100] border-b border-white/5 flex items-center justify-between"
        style={{
          top: 0,
          height: 'calc(var(--sat) + 3.5rem)',
          paddingTop: 'var(--sat)',
          background: '#000000',
          paddingLeft: 'calc(var(--sal) + 1rem)',
          paddingRight: 'calc(var(--sar) + 1rem)',
        }}
      >
        {/* Left: hamburger with dark rect background */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 bg-zinc-800 text-white active:bg-zinc-700"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" strokeWidth={1.5} />
          ) : (
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          )}
        </button>

        {/* Center: Dashboard title */}
        <span style={{ fontFamily: "'Basis Grotesque Pro', sans-serif", fontWeight: 600, fontSize: 17, color: '#f4f4f5', letterSpacing: '-0.01em', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          Dashboard
        </span>

        {/* Right: bell only */}
        <NotificationBell />
      </header>

      {/* ===== MOBILE DRAWER BACKDROP ===== */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleMobileClose}
      />

      {/* ===== MOBILE DRAWER ===== */}
      <nav
        className={cn(
          "md:hidden fixed left-0 top-0 bottom-0 z-[110] w-[85%] max-w-[320px]",
          "border-r border-white/5 shadow-2xl shadow-black/50",
          "flex flex-col transition-transform duration-200 ease-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "#000000",
          paddingLeft: 'var(--sal)',
          paddingBottom: 'var(--sab)',
        }}
      >
        {/* Drawer Header */}
        <div
          className="shrink-0 border-b border-white/5 flex items-center justify-between px-4"
          style={{
            height: 'calc(var(--sat) + 3.5rem)',
            paddingTop: 'var(--sat)',
          }}
        >
          <Link to="/" className="flex items-center" onClick={handleMobileClose}>
            <img src={logoM3} alt="M3 Agency" className="h-7 w-auto" />
          </Link>
          <button
            onClick={handleMobileClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 active:bg-white/5 transition-all duration-150"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
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
        <div className="px-3 py-4 border-t border-white/5 shrink-0">
          {user && (
            <div className="px-4 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
                <div className="text-[10px] font-semibold text-zinc-700 uppercase tracking-[0.08em]">M3 AGENCY</div>
              </div>
              <button
                onClick={() => hardLogoutToAuth()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all duration-150"
                title="Sair"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ===== TABLET/DESKTOP SIDEBAR (>= 768px) ===== */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 z-40 transition-all duration-200 ease-out",
          "border-r border-white/[0.04] sidebar-compact-height",
          "h-[100dvh] min-h-screen",
          showCollapsed ? "w-[64px]" : "w-56"
        )}
        style={{
          background: "#000000",
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
        <nav className="flex-1 min-h-0 pr-2 py-2 space-y-2 overflow-y-auto overflow-x-hidden sidebar-nav-scroll">
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

        {/* ===== FOOTER ===== */}
        <div className="sidebar-footer px-2 py-3 border-t border-white/[0.04] shrink-0 mt-auto">
          {!showCollapsed && user && (
            <div className="px-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
                <div className="text-[10px] font-semibold text-zinc-700 uppercase tracking-[0.08em]">M3 AGENCY</div>
              </div>
              <button
                onClick={() => hardLogoutToAuth()}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all duration-150"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
