import { useAuth } from "@/hooks/useAuth";
import { Outlet, useLocation } from "react-router-dom";
import { Radio } from "lucide-react";
import LiveMatchHistory from "./LiveMatchHistory";

export default function LiveMatch() {
  const { isAdmin, isScout, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

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

  // If at /app/live-match exactly, show history instead of redirecting
  if (location.pathname === "/app/live-match") {
    return <LiveMatchHistory />;
  }

  return <Outlet />;
}
