import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="players" element={<AppPlayers />} />
            {/* More app routes will be added here */}
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
