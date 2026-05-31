import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Trophy, Star, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFixed } from "@/lib/formatters";
import { logFetchSuccess, logFetchError, logFetchSkipped, isAbortError } from "@/lib/fetchLogger";

interface RankedPlayer {
  id: string;
  full_name: string;
  position: string;
  auto_rating: number | null;
  current_club: string | null;
  age: number | null;
}

const POSITIONS = [
  { value: "all", label: "Todas as Posições" },
  { value: "Goleiro", label: "Goleiro" },
  { value: "Zagueiro", label: "Zagueiro" },
  { value: "Lateral Direito", label: "Lateral Direito" },
  { value: "Lateral Esquerdo", label: "Lateral Esquerdo" },
  { value: "Volante", label: "Volante" },
  { value: "Meia", label: "Meia" },
  { value: "Meia Atacante", label: "Meia Atacante" },
  { value: "Ponta Direita", label: "Ponta Direita" },
  { value: "Ponta Esquerda", label: "Ponta Esquerda" },
  { value: "Centroavante", label: "Centroavante" },
  { value: "Atacante", label: "Atacante" },
];

const getMedalColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "text-yellow-500";
    case 2:
      return "text-gray-400";
    case 3:
      return "text-amber-600";
    default:
      return "text-muted-foreground";
  }
};

// Rating color: 4.5+ = green, 4+ = blue, 3+ = amber, <3 = muted
const getRatingBgColor = (rating: number | null) => {
  if (!rating) return "bg-muted";
  if (rating >= 4.5) return "bg-emerald-500/20 text-emerald-500";
  if (rating >= 4.0) return "bg-blue-500/20 text-blue-500";
  if (rating >= 3.0) return "bg-amber-500/20 text-amber-500";
  return "bg-muted text-muted-foreground";
};

export const PlayerRankingCard = () => {
  const { session, permissionsLoading, rolesLoading } = useAuth();
  const rbacReady = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState("all");

  const fetchRankedPlayers = useCallback(async () => {
    // GUARD: Only fetch when RBAC is ready
    if (!session?.user) {
      logFetchSkipped("PlayerRankingCard", "no session");
      return;
    }
    if (!rbacReady) {
      logFetchSkipped("PlayerRankingCard", "rbac not ready");
      return;
    }
    
    setLoading(true);
    const fetchStart = performance.now();
    
    try {
      let query = supabase
        .from("players")
        .select("id, full_name, position, auto_rating, current_club, age")
        .not("auto_rating", "is", null)
        .or("is_archived.is.null,is_archived.eq.false")
        .order("auto_rating", { ascending: false })
        .limit(10);

      if (positionFilter !== "all") {
        query = query.eq("position", positionFilter);
      }

      const { data, error } = await query;

      if (error) {
        logFetchError(error, { 
          endpoint: "PlayerRankingCard.players",
          context: { positionFilter }
        });
        return;
      }
      
      logFetchSuccess({ endpoint: "PlayerRankingCard" }, performance.now() - fetchStart);
      setPlayers(data || []);
    } catch (error) {
      // Handle AbortError gracefully
      if (isAbortError(error)) {
        if (import.meta.env.DEV) {
          console.log("[FETCH ABORT] PlayerRankingCard - request cancelled");
        }
        return;
      }
      logFetchError(error, { endpoint: "PlayerRankingCard" });
    } finally {
      setLoading(false);
    }
  }, [session?.user, rbacReady, positionFilter]);

  // Fetch when RBAC is ready or filter changes
  useEffect(() => {
    if (rbacReady) {
      fetchRankedPlayers();
    }
  }, [rbacReady, positionFilter, fetchRankedPlayers]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Ranking de Atletas</h2>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Filtrar por posição" />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos.value} value={pos.value}>
                  {pos.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-secondary/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : players.length > 0 ? (
        <div className="space-y-2">
          {players.map((player, index) => (
            <Link
              key={player.id}
              to={`/dashboard/atletas/${player.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index < 3 ? "bg-primary/10" : "bg-muted"
                }`}>
                  {index < 3 ? (
                    <Trophy className={`w-4 h-4 ${getMedalColor(index + 1)}`} />
                  ) : (
                    <span className="text-sm text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {player.full_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{player.position}</span>
                    {player.age && (
                      <>
                        <span>•</span>
                        <span>{player.age} anos</span>
                      </>
                    )}
                    {player.current_club && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{player.current_club}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`${getRatingBgColor(player.auto_rating)} border-0 font-semibold`}
                >
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {formatFixed(player.auto_rating, 1, "-")}
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum atleta com nota automática</p>
          <p className="text-sm mt-1">
            Adicione estatísticas aos atletas para gerar o ranking
          </p>
        </div>
      )}

      {players.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link 
            to="/dashboard/atletas"
            className="text-sm text-primary hover:underline flex items-center justify-center gap-1"
          >
            Ver todos os atletas
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
