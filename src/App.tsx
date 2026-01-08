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
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// App Pages
import Dashboard from "./pages/app/Dashboard";
import AppPlayers from "./pages/app/AppPlayers";
import NewPlayer from "./pages/app/NewPlayer";
import EditPlayer from "./pages/app/EditPlayer";
import ScoutingReports from "./pages/app/ScoutingReports";
import NewScoutingReport from "./pages/app/NewScoutingReport";
import EditScoutingReport from "./pages/app/EditScoutingReport";
import ReportDetail from "./pages/app/ReportDetail";
import Competitions from "./pages/app/Competitions";
import CompetitionsImport from "./pages/app/CompetitionsImport";

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
              <Route path="/players" element={<Players />} />
              <Route path="/players/:slug" element={<PlayerProfile />} />
              <Route path="/contact" element={<Contact />} />
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
              <Route path="players/:id/edit" element={<EditPlayer />} />
              <Route path="reports" element={<ScoutingReports />} />
              <Route path="reports/new" element={<NewScoutingReport />} />
              <Route path="reports/:id" element={<ReportDetail />} />
              <Route path="reports/:id/edit" element={<EditScoutingReport />} />
              <Route path="competitions" element={<Competitions />} />
              <Route path="competitions/import" element={<CompetitionsImport />} />
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
