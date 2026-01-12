import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
import RepresentacaoTalentos from "./pages/RepresentacaoTalentos";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CompetitionRankingPublic from "./pages/CompetitionRankingPublic";

// App Pages
import Dashboard from "./pages/app/Dashboard";
import AppPlayers from "./pages/app/AppPlayers";
import NewPlayer from "./pages/app/NewPlayer";
import EditPlayer from "./pages/app/EditPlayer";
import PlayerDetail from "./pages/app/PlayerDetail";
import ScoutingReports from "./pages/app/ScoutingReports";
import NewScoutingReport from "./pages/app/NewScoutingReport";
import EditScoutingReport from "./pages/app/EditScoutingReport";
import ReportDetail from "./pages/app/ReportDetail";
import Competitions from "./pages/app/Competitions";
import CompetitionsImport from "./pages/app/CompetitionsImport";
import CompetitionRanking from "./pages/app/CompetitionRanking";
import Leads from "./pages/app/Leads";
import Settings from "./pages/app/Settings";
import ComparePlayers from "./pages/app/ComparePlayers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
              <Route path="/competitions" element={<CompetitionRankingPublic />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/contato" element={<Contact />} />
            </Route>

            {/* Auth Route */}
            <Route path="/app/auth" element={<Auth />} />

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
              <Route path="players" element={<AppPlayers />} />
              <Route path="players/new" element={<NewPlayer />} />
              <Route path="players/:id" element={<PlayerDetail />} />
              <Route path="players/:id/edit" element={<EditPlayer />} />
              <Route path="compare" element={<ComparePlayers />} />
              <Route path="reports" element={<ScoutingReports />} />
              <Route path="reports/new" element={<NewScoutingReport />} />
              <Route path="reports/:id" element={<ReportDetail />} />
              <Route path="reports/:id/edit" element={<EditScoutingReport />} />
              <Route path="competitions" element={<Competitions />} />
              <Route path="competitions/import" element={<CompetitionsImport />} />
              <Route path="competitions/ranking" element={<CompetitionRanking />} />
              <Route path="leads" element={<Leads />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
