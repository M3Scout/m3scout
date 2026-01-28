import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequirePermission } from "@/components/auth/PermissionGate";
import { ThemeProvider } from "next-themes";
import { PWAProvider } from "@/components/pwa/PWAUpdateToast";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";

// Public Pages
import Index from "./pages/Index";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import Contact from "./pages/Contact";
import Sobre from "./pages/Sobre";
import Imprensa from "./pages/Imprensa";
import NewsDetail from "./pages/NewsDetail";
import RepresentacaoTalentos from "./pages/RepresentacaoTalentos";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CompetitionRankingPublic from "./pages/CompetitionRankingPublic";
import PendingAccess from "./pages/PendingAccess";
// App Pages
import Dashboard from "./pages/app/Dashboard";
import AppPlayers from "./pages/app/AppPlayers";
import NewPlayer from "./pages/app/NewPlayer";
import EditPlayer from "./pages/app/EditPlayer";
import PlayerDetail from "./pages/app/PlayerDetail";
import MyProfile from "./pages/app/MyProfile";
import ScoutingReports from "./pages/app/ScoutingReports";
import NewScoutingReport from "./pages/app/NewScoutingReport";
import EditScoutingReport from "./pages/app/EditScoutingReport";
import ReportDetail from "./pages/app/ReportDetail";
import Competitions from "./pages/app/Competitions";
import CompetitionsImport from "./pages/app/CompetitionsImport";
import CompetitionRanking from "./pages/app/CompetitionRanking";
import Leads from "./pages/app/Leads";
import Settings from "./pages/app/Settings";
import UserManagement from "./pages/app/UserManagement";
import ComparePlayers from "./pages/app/ComparePlayers";
import News from "./pages/app/News";
import NewsForm from "./pages/app/NewsForm";
import LiveMatch from "./pages/app/LiveMatch";
import LiveMatchNew from "./pages/app/LiveMatchNew";
import LiveMatchGame from "./pages/app/LiveMatchGame";
import LiveMatchReview from "./pages/app/LiveMatchReview";
import Teams from "./pages/app/Teams";
import MarketAtivos from "./pages/app/MarketAtivos";
import MarketTargets from "./pages/app/MarketTargets";
import GoalsMonitor from "./pages/app/GoalsMonitor";

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

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="m3-admin-theme">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/representacao-de-talentos" element={<RepresentacaoTalentos />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/atletas" element={<Players />} />
                  <Route path="/players/:slug" element={<PlayerProfile />} />
                  <Route path="/imprensa" element={<Imprensa />} />
                  <Route path="/imprensa/:slug" element={<NewsDetail />} />
                  <Route path="/competitions" element={<CompetitionRankingPublic />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/contato" element={<Contact />} />
                </Route>

                {/* Auth Route */}
                <Route path="/app/auth" element={<Auth />} />
                
                {/* Pending Access - for users without valid role */}
                <Route path="/pending-access" element={<PendingAccess />} />

                {/* Protected App Routes */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="my-profile" element={<MyProfile />} />
                  <Route path="players" element={<RequirePermission module="players"><AppPlayers /></RequirePermission>} />
                  <Route path="players/new" element={<RequirePermission module="players" action="create"><NewPlayer /></RequirePermission>} />
                  <Route path="players/:id" element={<RequirePermission module="players"><PlayerDetail /></RequirePermission>} />
                  <Route path="players/:id/edit" element={<RequirePermission module="players" action="edit"><EditPlayer /></RequirePermission>} />
                  <Route path="compare" element={<RequirePermission module="compare"><ComparePlayers /></RequirePermission>} />
                  <Route path="reports" element={<RequirePermission module="reports"><ScoutingReports /></RequirePermission>} />
                  <Route path="reports/new" element={<RequirePermission module="reports" action="create"><NewScoutingReport /></RequirePermission>} />
                  <Route path="reports/:id" element={<RequirePermission module="reports"><ReportDetail /></RequirePermission>} />
                  <Route path="reports/:id/edit" element={<RequirePermission module="reports" action="edit"><EditScoutingReport /></RequirePermission>} />
                  <Route path="competitions" element={<RequirePermission module="competitions"><Competitions /></RequirePermission>} />
                  <Route path="competitions/import" element={<RequirePermission module="competitions" action="create"><CompetitionsImport /></RequirePermission>} />
                  <Route path="competitions/ranking" element={<RequirePermission module="competitions"><CompetitionRanking /></RequirePermission>} />
                  <Route path="leads" element={<RequirePermission module="leads"><Leads /></RequirePermission>} />
                  <Route path="news" element={<RequirePermission module="news"><News /></RequirePermission>} />
                  <Route path="news/new" element={<RequirePermission module="news" action="create"><NewsForm /></RequirePermission>} />
                  <Route path="news/:id/edit" element={<RequirePermission module="news" action="edit"><NewsForm /></RequirePermission>} />
                  <Route path="live-match" element={<RequirePermission module="live_match"><LiveMatch /></RequirePermission>}>
                    <Route path="new" element={<LiveMatchNew />} />
                    <Route path=":matchId" element={<LiveMatchGame />} />
                    <Route path=":matchId/review" element={<LiveMatchReview />} />
                  </Route>
                  <Route path="teams" element={<Teams />} />
                  <Route path="market/ativos" element={<RequirePermission module="players"><MarketAtivos /></RequirePermission>} />
                  <Route path="market/targets" element={<RequirePermission module="players"><MarketTargets /></RequirePermission>} />
                  <Route path="goals-monitor" element={<RequirePermission module="users" action="manage"><GoalsMonitor /></RequirePermission>} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/users" element={<RequirePermission module="users" action="manage"><UserManagement /></RequirePermission>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </PWAProvider>
          </TooltipProvider>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
