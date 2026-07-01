import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/authContext";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequirePermission } from "@/components/auth/PermissionGate";
import { ThemeProvider } from "next-themes";
import { PWAProvider } from "@/components/pwa/PWAUpdateToast";
import { AppShell } from "@/components/app/AppShell";
import { usePrefetchRoutes } from "@/hooks/usePrefetchRoutes";
import { Suspense, lazy } from "react";
import { RouteSuspense, LiveMatchSuspense } from "@/components/app/RouteSuspense";

// Layouts - Keep static (always needed)
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";

// Public Pages - Only Index is static (landing page LCP performance)
import Index from "./pages/Index";

// All other public pages are lazy-loaded to reduce initial bundle size (~8MB → ~2MB)
const Players = lazy(() => import("./pages/Players"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const Contact = lazy(() => import("./pages/Contact"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Imprensa = lazy(() => import("./pages/Imprensa"));
const ImprensaTodas = lazy(() => import("./pages/ImprensaTodas"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const RepresentacaoTalentos = lazy(() => import("./pages/RepresentacaoTalentos"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompetitionRankingPublic = lazy(() => import("./pages/CompetitionRankingPublic"));
const PendingAccess = lazy(() => import("./pages/PendingAccess"));

// ============ LAZY LOADED APP PAGES ============
// Each route is a separate chunk for optimal code splitting

// Dashboard & Core
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const MyProfile = lazy(() => import("./pages/app/MyProfile"));
const MyContracts = lazy(() => import("./pages/app/MyContracts"));
const Settings = lazy(() => import("./pages/app/Settings"));

// Players Module
const AppPlayers = lazy(() => import("./pages/app/AppPlayers"));
const NewPlayer = lazy(() => import("./pages/app/NewPlayer"));
const EditPlayer = lazy(() => import("./pages/app/EditPlayer"));
import PlayerDetail from "./pages/app/PlayerDetail";

// Compare - static to avoid chunk-load failures after deploys
import ComparePlayers from "./pages/app/ComparePlayers";

// Reports Module - static to avoid chunk-load failures after deploys
import ScoutingReports from "./pages/app/ScoutingReports";
const NewScoutingReport = lazy(() => import("./pages/app/NewScoutingReport"));
const EditScoutingReport = lazy(() => import("./pages/app/EditScoutingReport"));
const ReportDetail = lazy(() => import("./pages/app/ReportDetail"));

// Competitions
const Competitions = lazy(() => import("./pages/app/Competitions"));
const CompetitionsImport = lazy(() => import("./pages/app/CompetitionsImport"));
const CompetitionRanking = lazy(() => import("./pages/app/CompetitionRanking"));

// Live Match - Critical for mobile scouts
const LiveMatch = lazy(() => import("./pages/app/LiveMatch"));
const LiveMatchNew = lazy(() => import("./pages/app/LiveMatchNew"));
const LiveMatchGame = lazy(() => import("./pages/app/LiveMatchGame"));
const LiveMatchReview = lazy(() => import("./pages/app/LiveMatchReview"));

// Market & Contracts
const MarketAtivos = lazy(() => import("./pages/app/MarketAtivos"));
const MarketTargets = lazy(() => import("./pages/app/MarketTargets"));
const Contracts = lazy(() => import("./pages/app/Contracts"));

const Prancheta = lazy(() => import("./pages/app/Prancheta"));

// Laboratório Tático
const LaboratorioTaticoPage = lazy(() => import("./pages/app/LaboratorioTaticoPage"));

// Admin
const Leads = lazy(() => import("./pages/app/Leads"));
const News = lazy(() => import("./pages/app/News"));
const NewsForm = lazy(() => import("./pages/app/NewsForm"));
const Teams = lazy(() => import("./pages/app/Teams"));
const GoalsMonitor = lazy(() => import("./pages/app/GoalsMonitor"));
const MyGoalsPage  = lazy(() => import("./pages/app/MyGoalsPage"));
const UserManagement = lazy(() => import("./pages/app/UserManagement"));

// Debug Pages
const DebugAuth = lazy(() => import("./pages/app/DebugAuth"));
const DebugLiveMatch = lazy(() => import("./pages/app/DebugLiveMatch"));
const DebugPerformance = lazy(() => import("./pages/app/DebugPerformance"));

// React Query config - prevent refetching on mount/focus for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - data stays fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab focus (we handle this manually for RBAC)
      refetchOnMount: false, // Don't refetch if data exists
      retry: 1, // Only 1 retry for failed queries
    },
  },
});

// Inner component that can use auth context
function AppRoutes() {
  const { loading, rolesLoading, permissionsLoading, isRecovering, hasAuthTimeout, signOut } = useAuth();
  
  // Prefetch critical routes after boot
  usePrefetchRoutes();
  
  // Public routes (landing, atletas, sobre, etc.) must NEVER be blocked by
  // auth bootstrap — otherwise first-time mobile visitors see a blank/loading
  // screen before the marketing site renders.
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isProtectedPath = path === "/dashboard" || path.startsWith("/dashboard/");

  // Determine loading state and reason
  const isBootstrapping = isProtectedPath && (loading || (rolesLoading && !isRecovering));
  const loadingReason = !isProtectedPath
    ? null
    : loading
      ? "boot"
      : (rolesLoading || permissionsLoading)
        ? "auth_recovery"
        : null;

  // Logout handler for AppShell
  const handleLogout = async () => {
    await signOut();
    window.location.href = "/dashboard/auth";
  };

  return (
    <AppShell 
      isLoading={isBootstrapping} 
      loadingReason={loadingReason}
      hasAuthTimeout={isProtectedPath && hasAuthTimeout}
      onLogout={handleLogout}
    >

      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/sobre" element={<Suspense fallback={<RouteSuspense />}><Sobre /></Suspense>} />
                <Route path="/representacao-de-talentos" element={<Suspense fallback={<RouteSuspense />}><RepresentacaoTalentos /></Suspense>} />
                <Route path="/players" element={<Suspense fallback={<RouteSuspense />}><Players /></Suspense>} />
                <Route path="/atletas" element={<Suspense fallback={<RouteSuspense />}><Players /></Suspense>} />
                <Route path="/players/:slug" element={<Suspense fallback={<RouteSuspense />}><PlayerProfile /></Suspense>} />
                <Route path="/imprensa" element={<Suspense fallback={<RouteSuspense />}><Imprensa /></Suspense>} />
                <Route path="/imprensa/todas" element={<Suspense fallback={<RouteSuspense />}><ImprensaTodas /></Suspense>} />
                <Route path="/imprensa/:slug" element={<Suspense fallback={<RouteSuspense />}><NewsDetail /></Suspense>} />
                <Route path="/competitions" element={<Suspense fallback={<RouteSuspense />}><CompetitionRankingPublic /></Suspense>} />
                <Route path="/contact" element={<Suspense fallback={<RouteSuspense />}><Contact /></Suspense>} />
                <Route path="/contato" element={<Suspense fallback={<RouteSuspense />}><Contact /></Suspense>} />
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<Suspense fallback={<RouteSuspense />}><Auth /></Suspense>} />
              <Route path="/dashboard/auth" element={<Suspense fallback={<RouteSuspense />}><Auth /></Suspense>} />
              
              {/* Pending Access - for users without valid role */}
              <Route path="/pending-access" element={<Suspense fallback={<RouteSuspense />}><PendingAccess /></Suspense>} />

              {/* Protected App Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Suspense fallback={<RouteSuspense />}><Dashboard /></Suspense>} />
                <Route path="my-profile" element={<Suspense fallback={<RouteSuspense />}><MyProfile /></Suspense>} />
                
                {/* Players → atletas */}
                <Route path="atletas" element={<RequirePermission module="players"><Suspense fallback={<RouteSuspense />}><AppPlayers /></Suspense></RequirePermission>} />
                <Route path="atletas/novo" element={<RequirePermission module="players" action="create"><Suspense fallback={<RouteSuspense />}><NewPlayer /></Suspense></RequirePermission>} />
                <Route path="atletas/:id" element={<RequirePermission module="players"><Suspense fallback={<RouteSuspense />}><PlayerDetail /></Suspense></RequirePermission>} />
                <Route path="atletas/:id/editar" element={<RequirePermission module="players" action="edit"><Suspense fallback={<RouteSuspense />}><EditPlayer /></Suspense></RequirePermission>} />

                {/* Prancheta tática */}
                <Route path="prancheta" element={<RequirePermission module="players"><Suspense fallback={<RouteSuspense />}><Prancheta /></Suspense></RequirePermission>} />

                {/* Compare → comparar */}
                <Route path="comparar" element={<RequirePermission module="compare"><ComparePlayers /></RequirePermission>} />

                {/* Reports → relatorios */}
                <Route path="relatorios" element={<RequirePermission module="reports"><ScoutingReports /></RequirePermission>} />
                <Route path="relatorios/novo" element={<RequirePermission module="reports" action="create"><Suspense fallback={<RouteSuspense />}><NewScoutingReport /></Suspense></RequirePermission>} />
                <Route path="relatorios/:id" element={<RequirePermission module="reports"><Suspense fallback={<RouteSuspense />}><ReportDetail /></Suspense></RequirePermission>} />
                <Route path="relatorios/:id/editar" element={<RequirePermission module="reports" action="edit"><Suspense fallback={<RouteSuspense />}><EditScoutingReport /></Suspense></RequirePermission>} />

                {/* Competitions → competicoes */}
                <Route path="competicoes" element={<RequirePermission module="competitions"><Suspense fallback={<RouteSuspense />}><Competitions /></Suspense></RequirePermission>} />
                <Route path="competicoes/importar" element={<RequirePermission module="competitions" action="create"><Suspense fallback={<RouteSuspense />}><CompetitionsImport /></Suspense></RequirePermission>} />
                <Route path="competicoes/ranking" element={<RequirePermission module="competitions"><Suspense fallback={<RouteSuspense />}><CompetitionRanking /></Suspense></RequirePermission>} />

                {/* Leads */}
                <Route path="leads" element={<RequirePermission module="leads"><Suspense fallback={<RouteSuspense />}><Leads /></Suspense></RequirePermission>} />

                {/* News → noticias */}
                <Route path="noticias" element={<RequirePermission module="news"><Suspense fallback={<RouteSuspense />}><News /></Suspense></RequirePermission>} />
                <Route path="noticias/nova" element={<RequirePermission module="news" action="create"><Suspense fallback={<RouteSuspense />}><NewsForm /></Suspense></RequirePermission>} />
                <Route path="noticias/:id/editar" element={<RequirePermission module="news" action="edit"><Suspense fallback={<RouteSuspense />}><NewsForm /></Suspense></RequirePermission>} />

                {/* Live Match → aovivo */}
                <Route path="aovivo" element={<RequirePermission module="live_match"><Suspense fallback={<LiveMatchSuspense />}><LiveMatch /></Suspense></RequirePermission>}>
                  <Route path="novo" element={<Suspense fallback={<LiveMatchSuspense />}><LiveMatchNew /></Suspense>} />
                  <Route path=":matchId" element={<Suspense fallback={<LiveMatchSuspense />}><LiveMatchGame /></Suspense>} />
                  <Route path=":matchId/revisao" element={<Suspense fallback={<LiveMatchSuspense />}><LiveMatchReview /></Suspense>} />
                </Route>
                
                {/* Teams */}
                <Route path="teams" element={<Suspense fallback={<RouteSuspense />}><Teams /></Suspense>} />
                
                {/* Market */}
                <Route path="ativos" element={<RequirePermission module="players"><Suspense fallback={<RouteSuspense />}><MarketAtivos /></Suspense></RequirePermission>} />
                <Route path="monitoramento" element={<RequirePermission module="players"><Suspense fallback={<RouteSuspense />}><MarketTargets /></Suspense></RequirePermission>} />
                
                {/* Goals Monitor — admin */}
                <Route path="metas" element={<RequirePermission module="users" action="manage"><Suspense fallback={<RouteSuspense />}><GoalsMonitor /></Suspense></RequirePermission>} />
                {/* Goals Monitor — player (own goals only) */}
                <Route path="minhas-metas" element={<Suspense fallback={<RouteSuspense />}><MyGoalsPage /></Suspense>} />

                {/* Laboratório Tático */}
                <Route path="laboratorio" element={<Suspense fallback={<RouteSuspense />}><LaboratorioTaticoPage /></Suspense>} />
                
                {/* Contracts */}
                <Route path="contratos" element={<RequirePermission module="players"><Suspense fallback={<RouteSuspense />}><Contracts /></Suspense></RequirePermission>} />
                <Route path="meus-contratos" element={<Suspense fallback={<RouteSuspense />}><MyContracts /></Suspense>} />
                
                {/* Settings */}
                <Route path="settings" element={<Suspense fallback={<RouteSuspense />}><Settings /></Suspense>} />
                <Route path="usuarios" element={<RequirePermission module="users" action="manage"><Suspense fallback={<RouteSuspense />}><UserManagement /></Suspense></RequirePermission>} />
                
                {/* Debug routes - admin only */}
                <Route path="debug/auth" element={<Suspense fallback={<RouteSuspense />}><DebugAuth /></Suspense>} />
                <Route path="debug/live-match" element={<Suspense fallback={<RouteSuspense />}><DebugLiveMatch /></Suspense>} />
                <Route path="debug/performance" element={<Suspense fallback={<RouteSuspense />}><DebugPerformance /></Suspense>} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Suspense fallback={<RouteSuspense />}><NotFound /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </PWAProvider>
      </TooltipProvider>
    </AppShell>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="m3-admin-theme">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <AppRoutes />
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
