/**
 * My Profile Page - Redirects Player role users to full PlayerDetail
 * 
 * Players now see the EXACT same profile view as Admin, but in read-only mode.
 * This component simply redirects to /app/players/{linkedPlayerId}
 */

import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { Loader2 } from "lucide-react";
import { PlayerAccountUnlinked } from "@/components/auth/PlayerAccountUnlinked";

export default function MyProfile() {
  const { user, linkedPlayerId, isPlayer, rolesLoading } = useAuth();

  // Loading state while RBAC resolves
  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If player role but no linked athlete
  if (isPlayer && !linkedPlayerId) {
    return <PlayerAccountUnlinked userEmail={user?.email} />;
  }

  // Redirect to full PlayerDetail page
  if (linkedPlayerId) {
    return <Navigate to={`/app/players/${linkedPlayerId}`} replace />;
  }

  // Fallback - shouldn't reach here normally
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-xl font-semibold">Perfil não encontrado</h2>
      <p className="text-zinc-500">Não foi possível carregar seus dados.</p>
    </div>
  );
}
