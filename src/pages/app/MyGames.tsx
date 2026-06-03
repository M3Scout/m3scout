/**
 * My Games Page - Shows only matches where the linked player is in the lineup
 * 
 * This is a read-only view for PLAYER role users
 */

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getRatingBgColor, getRatingColor } from "@/lib/matchRatingEngine";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Radio,
  Calendar,
  Clock,
  Loader2,
  Trophy,
  Target,
  Zap,
  ChevronRight,
  Shield,
  MapPin,
  Play,
  Eye,
  Search,
} from "lucide-react";

interface MatchWithRating {
  id: string;
  opponent_name: string;
  match_date: string;
  status: string;
  venue: string | null;
  season_year: number;
  team_name_display: string | null;
  team_logo_url: string | null;
  opponent_logo_url: string | null;
  competition: { id: string; name: string; display_name: string | null } | null;
  player_participation: {
    started: boolean;
    minutes_played: number | null;
    entered_minute: number | null;
    exited_minute: number | null;
  };
  match_stats: {
    goals: number;
    assists: number;
    saves: number;
    yellow_cards: number;
    red_cards: number;
  } | null;
  rating: number | null;
}

// Loading skeleton
function MatchCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </motion.div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-4">
        <Radio className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-2">
        Nenhum jogo encontrado
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs">
        Você será notificado quando for escalado para uma partida.
      </p>
    </div>
  );
}

// Match Card
function PlayerMatchCard({ match }: { match: MatchWithRating }) {
  const isLive = match.status === "live";
  const isApplied = match.status === "applied";
  const hasRating = match.rating !== null && match.rating > 0;
  
  const ratingColor = hasRating ? getRatingColor(match.rating!) : "";
  const ratingBg = hasRating ? getRatingBgColor(match.rating!) : "";
  
  const matchLink = isApplied 
    ? `/app/live-match/${match.id}/review` 
    : `/app/live-match/${match.id}`;

  return (
    <Link to={matchLink}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className={cn(
          "p-4 rounded-xl border transition-all duration-200",
          "bg-gradient-to-br from-zinc-900/80 to-zinc-950/80",
          isLive 
            ? "border-red-500/40 hover:border-red-500/60" 
            : "border-zinc-800/40 hover:border-zinc-700/60"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Team Logos */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 flex items-center justify-center overflow-hidden">
              {match.team_logo_url ? (
                <img src={match.team_logo_url} alt="Team" className="w-8 h-8 object-contain" width={32} height={32} loading="lazy" decoding="async" />
              ) : (
                <Shield className="w-5 h-5 text-zinc-600" />
              )}
            </div>
            <span className="text-xs text-zinc-600 font-medium">vs</span>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 flex items-center justify-center overflow-hidden">
              {match.opponent_logo_url ? (
                <img src={match.opponent_logo_url} alt="Opponent" className="w-8 h-8 object-contain" width={32} height={32} loading="lazy" decoding="async" />
              ) : (
                <Shield className="w-5 h-5 text-zinc-600" />
              )}
            </div>
          </div>

          {/* Match Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isLive && (
                <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 animate-pulse">
                  AO VIVO
                </Badge>
              )}
              <p className="font-medium text-zinc-200 truncate">
                {match.team_name_display ?? "Time"} vs {match.opponent_name}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR })}
              </span>
              {match.competition && (
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {match.competition.display_name || match.competition.name}
                </span>
              )}
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {match.venue}
                </span>
              )}
            </div>

            {/* Player Stats */}
            {(match.match_stats || match.player_participation) && (
              <div className="flex items-center gap-3 mt-2 text-xs">
                {match.player_participation?.started && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                    Titular
                  </Badge>
                )}
                {match.player_participation?.minutes_played !== null && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3 h-3" />
                    {match.player_participation.minutes_played}'
                  </span>
                )}
                {match.match_stats?.goals ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Target className="w-3 h-3" />
                    {match.match_stats.goals} gol{match.match_stats.goals > 1 ? 's' : ''}
                  </span>
                ) : null}
                {match.match_stats?.assists ? (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Zap className="w-3 h-3" />
                    {match.match_stats.assists} assist.
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Rating or Action */}
          <div className="shrink-0">
            {hasRating ? (
              <div className={cn("px-3 py-2 rounded-lg text-lg font-bold", ratingBg, "text-white")}>
                {match.rating!.toFixed(1)}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                <Eye className="w-5 h-5 text-zinc-500" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function MyGames() {
  const { linkedPlayerId } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");

  // Fetch matches where player is in lineup
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["my-games", linkedPlayerId],
    queryFn: async () => {
      if (!linkedPlayerId) return [];

      // First get all match_players entries for this player
      const { data: participations, error: participationsError } = await supabase
        .from("match_players")
        .select(`
          match_id,
          started,
          minutes_played,
          entered_minute,
          exited_minute,
          is_removed
        `)
        .eq("player_id", linkedPlayerId)
        .eq("is_removed", false);

      if (participationsError) throw participationsError;
      if (!participations || participations.length === 0) return [];

      const matchIds = participations.map(p => p.match_id);

      // Fetch match details
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          opponent_name,
          match_date,
          status,
          venue,
          season_year,
          team_name_display,
          team_logo_url,
          opponent_logo_url,
          competition:competitions(id, name, display_name)
        `)
        .in("id", matchIds)
        .order("match_date", { ascending: false });

      if (matchesError) throw matchesError;

      // Fetch player stats for these matches
      const { data: statsData } = await supabase
        .from("match_player_stats")
        .select("match_id, goals, assists, saves, yellow_cards, red_cards")
        .eq("player_id", linkedPlayerId)
        .in("match_id", matchIds);

      // Build the complete match objects
      const result: MatchWithRating[] = (matchesData || []).map(match => {
        const participation = participations.find(p => p.match_id === match.id);
        const stats = statsData?.find(s => s.match_id === match.id);

        return {
          ...match,
          player_participation: {
            started: participation?.started ?? false,
            minutes_played: participation?.minutes_played ?? null,
            entered_minute: participation?.entered_minute ?? null,
            exited_minute: participation?.exited_minute ?? null,
          },
          match_stats: stats ? {
            goals: stats.goals,
            assists: stats.assists,
            saves: stats.saves,
            yellow_cards: stats.yellow_cards,
            red_cards: stats.red_cards,
          } : null,
          rating: null, // Will be calculated from match_player_stats or other source
        };
      });

      return result;
    },
    enabled: !!linkedPlayerId,
  });

  // Group matches by status
  const liveMatches = useMemo(() => 
    matches.filter(m => m.status === "live"), 
    [matches]
  );
  const upcomingMatches = useMemo(() => 
    matches.filter(m => m.status === "draft"), 
    [matches]
  );
  const completedMatches = useMemo(() => 
    matches.filter(m => ["finished", "applied"].includes(m.status)), 
    [matches]
  );

  if (!linkedPlayerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-zinc-500">Carregando...</p>
      </div>
    );
  }

  const filteredMatches = useMemo(() => {
    if (!mobileSearch.trim()) return matches;
    const q = mobileSearch.toLowerCase();
    return matches.filter(m =>
      m.opponent_name.toLowerCase().includes(q) ||
      m.team_name_display?.toLowerCase().includes(q) ||
      m.competition?.name.toLowerCase().includes(q) ||
      m.competition?.display_name?.toLowerCase().includes(q)
    );
  }, [matches, mobileSearch]);

  const filteredLiveMatches = useMemo(() => filteredMatches.filter(m => m.status === "live"), [filteredMatches]);
  const filteredUpcomingMatches = useMemo(() => filteredMatches.filter(m => m.status === "draft"), [filteredMatches]);
  const filteredCompletedMatches = useMemo(() => filteredMatches.filter(m => ["finished", "applied"].includes(m.status)), [filteredMatches]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              <span className="sm:hidden">Jogos</span>
              <span className="hidden sm:inline">Meus Jogos</span>
            </h1>
            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">{matches.length}</span>
          </div>
          <button className="sm:hidden" onClick={() => setSearchOpen(v => !v)}>
            <Search size={18} className="text-zinc-400" />
          </button>
        </div>
        <p className="text-sm text-zinc-500 hidden sm:block">
          Partidas em que você foi escalado
        </p>
        {searchOpen && (
          <div className="sm:hidden mt-1">
            <input
              autoFocus
              value={mobileSearch}
              onChange={e => setMobileSearch(e.target.value)}
              placeholder="Buscar jogo..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
        )}
      </header>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {/* Live Matches */}
          {filteredLiveMatches.length > 0 && (
            <Card className="border-red-500/30 bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Ao Vivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredLiveMatches.map(match => (
                  <PlayerMatchCard key={match.id} match={match} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Matches */}
          {filteredUpcomingMatches.length > 0 && (
            <Card className="border-zinc-800/40 bg-zinc-950/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-300">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Próximas Partidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredUpcomingMatches.map(match => (
                  <PlayerMatchCard key={match.id} match={match} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completed Matches */}
          {filteredCompletedMatches.length > 0 && (
            <Card className="border-zinc-800/40 bg-zinc-950/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-300">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Partidas Realizadas
                </CardTitle>
                <CardDescription>
                  {filteredCompletedMatches.length} partida{filteredCompletedMatches.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredCompletedMatches.map(match => (
                  <PlayerMatchCard key={match.id} match={match} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
