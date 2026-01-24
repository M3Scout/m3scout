import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Outlet, useLocation } from "react-router-dom";
import { Radio, Loader2 } from "lucide-react";
import LiveMatchHistory from "./LiveMatchHistory";
import MyGames from "./MyGames";

export default function LiveMatch() {
  const { isAdmin, isScout, isPlayer, loading } = useAuth();
  const { isPlayerRole } = usePermissions();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // For PLAYER role: show their games only (filtered by lineup)
  if (isPlayer || isPlayerRole) {
    // If at /app/live-match exactly, show player's games
    if (location.pathname === "/app/live-match") {
      return <MyGames />;
    }
    // Otherwise, let the child routes handle access control
    return <Outlet />;
  }

  // For internal roles (admin/scout), they need proper permissions
  if (!isAdmin && !isScout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Radio className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Sem permissão</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta funcionalidade.
        </p>
      </div>
    );
  }

  // If at /app/live-match exactly, show history for internal users
  if (location.pathname === "/app/live-match") {
    return <LiveMatchHistory />;
  }

  return <Outlet />;
}
