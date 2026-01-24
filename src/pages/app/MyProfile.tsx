/**
 * My Profile Page - Personalized dashboard for Player role users
 * 
 * Shows the linked athlete's statistics, evolution, and recent matches
 * in a read-only, engaging format optimized for self-viewing.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getYouTubeEmbedUrl, safeArray } from "@/lib/utils";
import { isGoalkeeper } from "@/lib/positionUtils";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import { usePlayerMatchStats } from "@/hooks/usePlayerMatchStats";
import { getRatingBgColor, getRatingColor } from "@/lib/matchRatingEngine";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PlayerAccountUnlinked } from "@/components/auth/PlayerAccountUnlinked";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Trophy,
  Target,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Loader2,
  Play,
  Star,
  Zap,
  BarChart3,
  Shield,
  Crosshair,
  MapPin,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Components
import { UnifiedRadarCard } from "@/components/players/UnifiedRadarCard";
import { MatchRatingEvolutionChart } from "@/components/players/sections/MatchRatingEvolutionChart";
import { SeasonSummaryCard } from "@/components/players/sections/SeasonSummaryCard";
import { PlayerRatingBadge } from "@/components/players/PlayerRatingBadge";

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[] | null;
  age: number | null;
  birth_date: string | null;
  nationality: string;
  current_club: string | null;
  country: string | null;
  height: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  bio_public: string | null;
  highlight_video_url: string | null;
  auto_rating: number | null;
  overall_rating: number | null;
  potential_rating: number | null;
  rating_updated_at: string | null;
  physical_status: string | null;
  play_style: string | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
  strengths: string[] | null;
  areas_to_develop: string[] | null;
  market_value: number | null;
  market_value_currency: string | null;
}

// Hero Stats Card
function HeroStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  variant = "default" 
}: { 
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  variant?: "default" | "primary" | "success" | "warning";
}) {
  const variantStyles = {
    default: "from-zinc-900/90 to-zinc-950/90 border-zinc-800/40",
    primary: "from-primary/10 via-zinc-900/90 to-zinc-950/90 border-primary/20",
    success: "from-emerald-500/10 via-zinc-900/90 to-zinc-950/90 border-emerald-500/20",
    warning: "from-amber-500/10 via-zinc-900/90 to-zinc-950/90 border-amber-500/20",
  };

  const iconStyles = {
    default: "bg-zinc-800/60 text-zinc-400",
    primary: "bg-primary/15 text-primary",
    success: "bg-emerald-500/15 text-emerald-400",
    warning: "bg-amber-500/15 text-amber-400",
  };

  return (
    <div className={cn(
      "relative p-4 rounded-xl",
      "bg-gradient-to-br border backdrop-blur-sm",
      "transition-all duration-300 hover:scale-[1.02]",
      variantStyles[variant]
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
          <div className="text-2xl font-bold text-white leading-none mt-0.5">{value}</div>
          {subValue && <p className="text-xs text-zinc-500 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

// Recent Match Card
function RecentMatchCard({ match }: { match: any }) {
  const ratingColor = getRatingColor(match.rating.rating ?? 0);
  const ratingBg = getRatingBgColor(match.rating.rating ?? 0);
  
  return (
    <Link 
      to={`/app/live-match/${match.match_id}/review`}
      className="block"
    >
      <div className={cn(
        "p-4 rounded-xl border transition-all duration-200",
        "bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-zinc-800/40",
        "hover:border-zinc-700/60 hover:from-zinc-800/80"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("px-2 py-1 rounded-md text-sm font-bold", ratingBg, "text-white")}>
              {match.rating.rating?.toFixed(1) ?? "-"}
            </div>
            <span className={cn("text-xs font-medium", ratingColor)}>
              {(match.rating.rating ?? 0) >= 8 ? "Excelente" :
               (match.rating.rating ?? 0) >= 7 ? "Muito Bom" :
               (match.rating.rating ?? 0) >= 6 ? "Bom" : "Regular"}
            </span>
          </div>
          <span className="text-xs text-zinc-500">
            {format(new Date(match.match_date), "dd MMM", { locale: ptBR })}
          </span>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-200 truncate">
            {match.team_name_display ?? "Time"} vs {match.opponent_name ?? "Adversário"}
          </p>
          {match.competition_name && (
            <p className="text-xs text-zinc-500 truncate">{match.competition_name}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {match.minutes_played}'
          </span>
          {match.stats.goals > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Target className="w-3 h-3" />
              {match.stats.goals} gol{match.stats.goals > 1 ? 's' : ''}
            </span>
          )}
          {match.stats.assists > 0 && (
            <span className="flex items-center gap-1 text-blue-400">
              <Zap className="w-3 h-3" />
              {match.stats.assists} assist.
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Strength Chip
function StrengthChip({ label, type }: { label: string; type: "strength" | "develop" }) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs",
        type === "strength" 
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
      )}
    >
      {label}
    </Badge>
  );
}

export default function MyProfile() {
  const navigate = useNavigate();
  const { user, linkedPlayerId, isPlayer } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch player data
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!linkedPlayerId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", linkedPlayerId)
        .limit(1);

      const playerRow = Array.isArray(data) ? data[0] ?? null : null;
      if (playerRow) {
        setPlayer(playerRow as Player);
      }
      setLoading(false);
    };

    fetchPlayer();
  }, [linkedPlayerId]);

  // Match ratings for stats
  const {
    matches: matchesWithRatings,
    averageRating,
    bestMatch,
    recentTrend,
    totals,
    isLoading: ratingsLoading,
  } = usePlayerMatchRatings({
    playerId: linkedPlayerId ?? "",
    playerPosition: player?.position,
    enabled: !!linkedPlayerId && !!player,
  });

  // Current season stats
  const currentYear = new Date().getFullYear();
  const { totals: seasonTotals, isLoading: statsLoading } = usePlayerMatchStats({
    playerId: linkedPlayerId ?? "",
    seasonYear: currentYear,
    enabled: !!linkedPlayerId,
  });

  // Recent matches with ratings
  const recentMatches = useMemo(() => {
    return matchesWithRatings
      .filter(m => m.rating.hasRating)
      .slice(0, 5);
  }, [matchesWithRatings]);

  // Trend icon
  const TrendIcon = recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Minus;
  const trendColor = recentTrend === "up" ? "text-emerald-400" : recentTrend === "down" ? "text-red-400" : "text-zinc-400";

  // If player role but no linked athlete
  if (!loading && isPlayer && !linkedPlayerId) {
    return <PlayerAccountUnlinked userEmail={user?.email} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No player found
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-xl font-semibold">Perfil não encontrado</h2>
        <p className="text-zinc-500">Não foi possível carregar seus dados.</p>
      </div>
    );
  }

  const isGK = isGoalkeeper(player.position);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800/40">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo & Basic Info */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-zinc-800/50 flex-shrink-0 ring-2 ring-zinc-700/50">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
              </div>
              
              {/* Name & Position */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-white truncate">
                  {player.full_name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    {player.position}
                  </Badge>
                  {safeArray(player.secondary_positions).slice(0, 2).map((pos) => (
                    <Badge key={pos} variant="outline" className="text-zinc-400 border-zinc-700">
                      {pos}
                    </Badge>
                  ))}
                </div>
                
                {/* Club & Location */}
                <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                  {player.current_club && (
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      {player.current_club}
                    </span>
                  )}
                  {player.nationality && (
                    <span className="flex items-center gap-1.5">
                      <Flag className="w-4 h-4" />
                      {player.nationality}
                    </span>
                  )}
                </div>

                {/* Rating Badge */}
                {player.auto_rating !== null && (
                  <div className="mt-4">
                    <PlayerRatingBadge
                      rating={player.auto_rating}
                      playerPosition={player.position}
                      size="lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <HeroStatCard
              icon={Trophy}
              label="Nota Média"
              value={averageRating?.toFixed(1) ?? "-"}
              subValue={recentTrend !== "stable" ? (recentTrend === "up" ? "Em alta" : "Em baixa") : undefined}
              variant={averageRating && averageRating >= 7 ? "success" : "default"}
            />
            <HeroStatCard
              icon={BarChart3}
              label="Partidas"
              value={seasonTotals?.matches ?? 0}
              subValue={`${currentYear}`}
              variant="default"
            />
            <HeroStatCard
              icon={Clock}
              label="Minutos"
              value={seasonTotals?.minutes ?? 0}
              subValue="na temporada"
              variant="default"
            />
            <HeroStatCard
              icon={isGK ? Shield : Target}
              label={isGK ? "Defesas" : "Gols"}
              value={isGK ? (seasonTotals?.saves ?? 0) : (seasonTotals?.goals ?? 0)}
              subValue={`${seasonTotals?.assists ?? 0} assist.`}
              variant={((isGK ? seasonTotals?.saves : seasonTotals?.goals) ?? 0) > 0 ? "primary" : "default"}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/40">
          <TabsTrigger value="overview" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Estatísticas</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="evolution" className="gap-2">
            <Activity className="w-4 h-4" />
            <span>Evolução</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Season Summary */}
              <SeasonSummaryCard playerId={player.id} playerPosition={player.position} />
              
              {/* Recent Matches */}
              <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 to-zinc-900/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                    Últimas Partidas
                  </CardTitle>
                  <CardDescription>Suas partidas mais recentes com avaliação</CardDescription>
                </CardHeader>
                <CardContent>
                  {ratingsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                    </div>
                  ) : recentMatches.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma partida com avaliação ainda</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recentMatches.map((match) => (
                        <RecentMatchCard key={match.match_id} match={match} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Highlight Video */}
              {player.highlight_video_url && (() => {
                const embedUrl = getYouTubeEmbedUrl(player.highlight_video_url);
                if (!embedUrl) return null;
                return (
                  <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 to-zinc-900/95">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="w-5 h-5 text-primary" />
                        Melhores Momentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={embedUrl}
                          title="Player Highlights"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Radar Chart */}
              <UnifiedRadarCard 
                playerId={player.id} 
                playerPosition={player.position} 
                showFilters={false} 
              />

              {/* Profile Details */}
              <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 to-zinc-900/95">
                <CardHeader>
                  <CardTitle className="text-lg">Perfil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {player.age && (
                      <div>
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Idade</p>
                        <p className="font-medium">{player.age} anos</p>
                      </div>
                    )}
                    {player.height && (
                      <div>
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Altura</p>
                        <p className="font-medium">{player.height} cm</p>
                      </div>
                    )}
                    {player.dominant_foot && (
                      <div>
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Pé</p>
                        <p className="font-medium capitalize">{player.dominant_foot}</p>
                      </div>
                    )}
                    {player.play_style && (
                      <div>
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Estilo</p>
                        <p className="font-medium">{player.play_style}</p>
                      </div>
                    )}
                  </div>

                  {/* Tactical Roles */}
                  {(player.primary_tactical_role || player.secondary_tactical_role) && (
                    <div className="pt-2 border-t border-zinc-800/50">
                      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Funções Táticas</p>
                      <div className="flex flex-wrap gap-2">
                        {player.primary_tactical_role && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            {player.primary_tactical_role}
                          </Badge>
                        )}
                        {player.secondary_tactical_role && (
                          <Badge variant="outline" className="text-zinc-400">
                            {player.secondary_tactical_role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Areas to Develop */}
                  {(safeArray(player.strengths).length > 0 || safeArray(player.areas_to_develop).length > 0) && (
                    <div className="pt-2 border-t border-zinc-800/50 space-y-3">
                      {safeArray(player.strengths).length > 0 && (
                        <div>
                          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Pontos Fortes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {safeArray(player.strengths).map((s, i) => (
                              <StrengthChip key={i} label={s} type="strength" />
                            ))}
                          </div>
                        </div>
                      )}
                      {safeArray(player.areas_to_develop).length > 0 && (
                        <div>
                          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">A Desenvolver</p>
                          <div className="flex flex-wrap gap-1.5">
                            {safeArray(player.areas_to_develop).map((a, i) => (
                              <StrengthChip key={i} label={a} type="develop" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <SeasonSummaryCard playerId={player.id} playerPosition={player.position} />
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolution">
          <MatchRatingEvolutionChart 
            playerId={player.id} 
            playerName={player.full_name} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
