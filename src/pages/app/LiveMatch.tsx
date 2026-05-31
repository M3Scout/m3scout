import { useAuth } from "@/hooks/authContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Outlet, useLocation } from "react-router-dom";
import { Radio, Loader2 } from "lucide-react";
import LiveMatchHistory from "./LiveMatchHistory";
import MyGames from "./MyGames";

export default function LiveMatch() {
  const { isPlayer, loading } = useAuth();
  const { isPlayerRole, can, loading: permissionsLoading } = usePermissions();
  const location = useLocation();
  
  // Wait for both auth and permissions to load
  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // For PLAYER role: show their games only (filtered by lineup)
  if (isPlayer || isPlayerRole) {
    // If at /app/live-match exactly, show player's games
    if (location.pathname === "/dashboard/aovivo") {
      return <MyGames />;
    }
    // Otherwise, let the child routes handle access control
    return <Outlet />;
  }

  // Check permission using can() - works for admin, scout, editor, viewer
  const hasLiveMatchAccess = can("live_match", "view");

  if (!hasLiveMatchAccess) {
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

  // If at /app/live-match exactly, show history for internal users with permission
  if (location.pathname === "/dashboard/aovivo") {
    return <LiveMatchHistory />;
  }

  return <Outlet />;
}
