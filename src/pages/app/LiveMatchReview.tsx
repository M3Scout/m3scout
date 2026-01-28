import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { calculateBallActionsFromMatchStats } from "@/lib/derivedBallActions";
import { normalizeMatchStats, type RawMatchStats } from "@/lib/normalizeMatchStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { HalfStatsComparison } from "@/components/live-match/HalfStatsComparison";
import { SubstitutionStatsCard } from "@/components/live-match/SubstitutionStatsCard";
import { EventDistributionChart } from "@/components/live-match/EventDistributionChart";
import { PlayerActivityHeatmap } from "@/components/live-match/PlayerActivityHeatmap";
import { PlayerPresenceHistory } from "@/components/live-match/PlayerPresenceHistory";
import { MatchSummaryPdfButton } from "@/components/live-match/MatchSummaryPdfButton";
import { MatchRatingsCard } from "@/components/live-match/MatchRatingsCard";
import { PlayerRatingBadge } from "@/components/live-match/PlayerRatingBadge";
import { PostGameInsightsCard } from "@/components/live-match/PostGameInsightsCard";
import { calculateMinutesPlayed, STANDARD_MATCH_DURATION } from "@/lib/minutesPlayed";
import { calculatePlayerMatchRating } from "@/lib/matchRatingEngine";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Users,
  TrendingUp,
  ExternalLink,
  Info,
  Pencil,
  Check,
  X,
  Clock,
} from "lucide-react";

// Map match events to player_stats columns
// NOTE: Events like dribble_success and dribble_attempt are NOT mapped directly to total_dribbles
// because total_dribbles = successful_dribbles + failed_dribbles (derived, not a direct mapping)
// The RPC apply_event_stats handles this correctly: dribble_success increments BOTH success AND total
const EVENT_TO_STAT_COLUMN: Partial<Record<MatchEventType, string>> = {
  goal: "goals",
  assist: "assists",
  shot: "shots",
  shot_on_target: "shots_on_target",
  key_pass: "key_passes",
  chance_created: "chances_created",
  dribble_success: "successful_dribbles",
  // dribble_attempt is NOT mapped to total_dribbles - it's a FAILED dribble, not the total!
  // total_dribbles should be derived as: successful_dribbles + failed_dribbles
  tackle: "tackles",
  interception: "interceptions",
  recovery: "recoveries",
  clearance: "clearances",
  duel_won: "duels_won",
  duel_total: "total_duels",
  aerial_duel_won: "aerial_duels_won",
  yellow: "yellow_cards",
  red: "red_cards",
  foul_committed: "fouls_committed",
  foul_suffered: "fouls_drawn",
  pass_success: "accurate_passes",
  // pass_total is also a FAILED pass event, not the total! Similar to dribbles.
  possession_lost: "possession_lost",
  save: "saves",
  goal_conceded: "goals_conceded",
  clean_sheet: "clean_sheets",
  penalty_saved: "penalties_saved",
  error_led_to_goal: "errors_leading_to_goal",
  box_save: "saves_inside_box",
  punch: "punches",
  high_claim: "high_claims",
  sweeper_action: "successful_runs_out",
};

// Event type labels for display
const EVENT_LABELS: Partial<Record<MatchEventType, string>> = {
  goal: "Gols",
  assist: "Assistências",
  shot: "Chutes",
  shot_on_target: "Chutes no Gol",
  key_pass: "Passes Decisivos",
  chance_created: "Chances Criadas",
  dribble_success: "Dribles Certos",
  dribble_attempt: "Dribles Tentados",
  tackle: "Desarmes",
  interception: "Interceptações",
  recovery: "Recuperações",
  clearance: "Cortes",
  duel_won: "Duelos Ganhos",
  duel_total: "Duelos Totais",
  aerial_duel_won: "Aéreos Ganhos",
  yellow: "Amarelos",
  red: "Vermelhos",
  foul_committed: "Faltas Cometidas",
  foul_suffered: "Faltas Sofridas",
  pass_success: "Passes Certos",
  pass_total: "Passes Totais",
  possession_lost: "Bolas Perdidas",
  save: "Defesas",
  goal_conceded: "Gols Sofridos",
  clean_sheet: "Clean Sheets",
  penalty_saved: "Pênaltis Defendidos",
  error_led_to_goal: "Erros→Gol",
  box_save: "Defesas na Área",
  punch: "Socos",
  high_claim: "Bolas Altas",
  sweeper_action: "Saídas do Gol",
};

interface Inconsistency {
  playerId: string;
  playerName: string;
  type: "warning" | "error" | "info";
  message: string;
}

export default function LiveMatchReview() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [appliedPlayerIds, setAppliedPlayerIds] = useState<string[]>([]);
  const [manualMinutes, setManualMinutes] = useState<Record<string, number>>({});
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const {
    match,
    matchPlayers,
    matchEvents,
    playerEventCounts,
    matchPlayerStats,
    playerStatsMap,
    isLoading,
    matchError,
    clearLocalDraft,
  } = useLiveMatch(matchId || "");

  // Detect inconsistencies (including GK-specific)
  // IMPORTANT: Use playerStatsMap (from match_player_stats table) for consistency checks
  // because the RPC apply_event_stats automatically increments totals when success events occur
  // (e.g., dribble_success increments both dribbles_success AND dribbles_total)
  const inconsistencies = useMemo<Inconsistency[]>(() => {
    if (!match) return [];
    const issues: Inconsistency[] = [];
    const duration = match.duration_minutes;
    
    // Calculate effective match duration including added time (acréscimos)
    // matchEffectiveDuration = base duration + 1st half added time + 2nd half added time
    const addedTime1T = match.added_time_first_half ?? 0;
    const addedTime2T = match.added_time_second_half ?? 0;
    const matchEffectiveDuration = duration + addedTime1T + addedTime2T;
    // Add tolerance of +2 minutes for registration variations
    const minutesTolerance = 2;

    matchPlayers.forEach((mp) => {
      if (!mp.player) return;
      
      // Use NORMALIZED stats which derive totals correctly
      // This prevents false positives like "dribbles_success > dribbles_total"
      // when the database has dribbles_total = 0 but dribbles_success = 3
      const rawStats = playerStatsMap[mp.player_id] as RawMatchStats | undefined;
      const normalizedStats = normalizeMatchStats(rawStats, {
        started: mp.started,
        entered_minute: mp.entered_minute ?? null,
        exited_minute: mp.exited_minute ?? null,
        minutes_played: mp.minutes_played,
      });
      
      const isGK = mp.position_template === "goalkeeper";

      // ===== CHECKS USING DERIVED TOTALS =====
      // These use the normalized values which guarantee total >= success
      
      // Shots on target vs total shots (derived)
      const shotsTotal = normalizedStats.shots_total;
      const shotsOnTarget = normalizedStats.shots_on_target ?? 0;
      // Only flag if shots_on_target exceeds even the derived total (shouldn't happen)
      if (shotsOnTarget > shotsTotal && shotsTotal > 0) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Chutes no gol (${shotsOnTarget}) > Chutes totais (${shotsTotal})`,
        });
      }

      // Dribbles - auto-derived totals, no warning needed
      // The normalization engine guarantees total >= success
      // REMOVED: Info messages for derived totals pollute the checklist

      // Duels won vs total (derived)
      const duelsWon = normalizedStats.duels_won ?? 0;
      const duelsTotal = normalizedStats.duels_total_derived;
      // Only flag if won > derived total (shouldn't happen after normalization)
      if (duelsWon > duelsTotal && duelsTotal > 0) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Duelos ganhos (${duelsWon}) > Duelos totais (${duelsTotal})`,
        });
      }

      // Passes - auto-derived totals, no warning needed
      // The normalization engine guarantees total >= success
      // REMOVED: Info messages for derived totals pollute the checklist

      // Minutes checks - use effective duration with added time + tolerance
      // Only flag as inconsistent if minutes exceed effective duration + tolerance
      const minutesPlayed = mp.minutes_played ?? duration;
      const maxAllowedMinutesPlayed = matchEffectiveDuration + minutesTolerance;
      if (minutesPlayed > maxAllowedMinutesPlayed) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Minutos jogados (${minutesPlayed}) excedem a duração efetiva do jogo (${matchEffectiveDuration} min com acréscimos)`,
        });
      }

      // Entered/exited minute range check
      // Allow extra 15 minutes for stoppage time (90 + 15 = 105 max for normal games)
      const maxAllowedMinute = duration + 15;
      if (mp.entered_minute !== null && (mp.entered_minute < 0 || mp.entered_minute > maxAllowedMinute)) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Minuto de entrada (${mp.entered_minute}) fora do intervalo 0-${maxAllowedMinute}`,
        });
      }
      if (mp.exited_minute !== null && (mp.exited_minute < 0 || mp.exited_minute > maxAllowedMinute)) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Minuto de saída (${mp.exited_minute}) fora do intervalo 0-${maxAllowedMinute}`,
        });
      }

      // GK-specific checks (use playerEventCounts for clean_sheet since it's an event, not aggregated stat)
      if (isGK) {
        const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
        const cleanSheets = counts.clean_sheet ?? 0;
        const goalsConceded = normalizedStats.goals_conceded ?? 0;

        // Clean sheet > 1 (can only have 1 per game)
        if (cleanSheets > 1) {
          issues.push({
            playerId: mp.player_id,
            playerName: mp.player.full_name,
            type: "warning",
            message: `Clean sheets (${cleanSheets}) > 1 por jogo`,
          });
        }

        // Clean sheet marked but goals conceded > 0
        if (cleanSheets > 0 && goalsConceded > 0) {
          issues.push({
            playerId: mp.player_id,
            playerName: mp.player.full_name,
            type: "error",
            message: `Clean sheet marcado mas tem gols sofridos (${goalsConceded})`,
          });
        }

        // Saves/goals ratio check (info only)
        const saves = normalizedStats.saves ?? 0;
        if (saves === 0 && goalsConceded > 2) {
          issues.push({
            playerId: mp.player_id,
            playerName: mp.player.full_name,
            type: "info",
            message: `${goalsConceded} gols sofridos sem nenhuma defesa registrada`,
          });
        }
      }

      // Player has no stats recorded
      const hasAnyStats = rawStats && (
        (rawStats.goals ?? 0) > 0 ||
        (rawStats.assists ?? 0) > 0 ||
        (rawStats.shots ?? 0) > 0 ||
        (rawStats.tackles ?? 0) > 0 ||
        (rawStats.interceptions ?? 0) > 0 ||
        (rawStats.recoveries ?? 0) > 0 ||
        (rawStats.passes_completed ?? 0) > 0 ||
        (rawStats.dribbles_success ?? 0) > 0 ||
        (rawStats.saves ?? 0) > 0
      );
      if (!hasAnyStats) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "info",
          message: "Nenhuma estatística registrada",
        });
      }
    });

    return issues;
  }, [match, matchPlayers, playerStatsMap, playerEventCounts]);

  // Calculate minutes played using standardized logic (always 90' game)
  const calculateMinutesPlayedForPlayer = (
    mp: typeof matchPlayers[0],
    _durationMinutes: number // Kept for signature compatibility but not used
  ): number => {
    const info = calculateMinutesPlayed({
      started: mp.started,
      entered_minute: mp.entered_minute,
      exited_minute: mp.exited_minute,
      minutes_played: mp.minutes_played,
    });
    return info.minutesPlayed;
  };

  // Apply stats mutation - now properly INCREMENTS existing stats
  const applyStats = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Jogo não encontrado");

      const appliedIds: string[] = [];
      const durationMinutes = match.duration_minutes;

      for (const mp of matchPlayers) {
        // Use match_player_stats (calculated by RPC with proper derivations like goal→shot_on_target)
        // instead of counting raw events which misses derived stats
        const matchStats = playerStatsMap[mp.player_id];
        
        // Use manual minutes if set, otherwise calculate automatically using standardized logic
        const minutesPlayed = manualMinutes[mp.player_id] ?? calculateMinutesPlayedForPlayer(mp, durationMinutes);

        // First, try to get existing stats
        const { data: existingStatsArr } = await supabase
          .from("player_stats")
          .select("*")
          .eq("player_id", mp.player_id)
          .eq("competition_id", match.competition_id)
          .eq("season_year", match.season_year)
          .limit(1);

        const existingStats = Array.isArray(existingStatsArr) ? existingStatsArr[0] ?? null : null;

        // Build update object with incremented values using match_player_stats
        // This ensures derived stats (goal → shots + shots_on_target) are correctly included
        const statsData: Record<string, number> = {
          matches: (existingStats?.matches ?? 0) + 1,
          minutes: (existingStats?.minutes ?? 0) + minutesPlayed,
        };

        // Map from match_player_stats columns to player_stats columns
        const MATCH_STATS_TO_PLAYER_STATS: Record<string, string> = {
          goals: "goals",
          assists: "assists",
          shots: "shots",
          shots_on_target: "shots_on_target",
          key_passes: "key_passes",
          chances_created: "chances_created",
          dribbles_success: "successful_dribbles",
          dribbles_total: "total_dribbles",
          tackles: "tackles",
          interceptions: "interceptions",
          recoveries: "recoveries",
          clearances: "clearances",
          duels_won: "duels_won",
          duels_total: "total_duels",
          aerial_duels_won: "aerial_duels_won",
          aerial_duels_total: "aerial_duels_total", // NEW: Map aerial duels total
          yellow_cards: "yellow_cards",
          red_cards: "red_cards",
          fouls_committed: "fouls_committed",
          fouls_suffered: "fouls_drawn",
          passes_completed: "accurate_passes",
          passes_total: "total_passes",
          possession_lost: "possession_lost",
          saves: "saves",
          goals_conceded: "goals_conceded",
        };

        if (matchStats) {
          // Use pre-calculated stats from match_player_stats (includes derived values)
          for (const [matchCol, playerCol] of Object.entries(MATCH_STATS_TO_PLAYER_STATS)) {
            const newValue = (matchStats as unknown as Record<string, number>)[matchCol] ?? 0;
            const existingValue = existingStats?.[playerCol as keyof typeof existingStats] ?? 0;
            statsData[playerCol] = (typeof existingValue === 'number' ? existingValue : 0) + newValue;
          }
        } else {
          // Fallback to event counting if no match_player_stats exist
          const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
          for (const [eventType, column] of Object.entries(EVENT_TO_STAT_COLUMN)) {
            const newValue = counts[eventType as MatchEventType] ?? 0;
            if (column) {
              const existingValue = existingStats?.[column as keyof typeof existingStats] ?? 0;
              statsData[column] = (typeof existingValue === 'number' ? existingValue : 0) + newValue;
            }
          }
          
          // CRITICAL: Derive total_dribbles and total_passes from success + failed counts
          // Since dribble_attempt and pass_total are FAILED attempts, not totals
          const dribbleSuccess = counts.dribble_success ?? 0;
          const dribbleFailed = counts.dribble_attempt ?? 0;
          const passSuccess = counts.pass_success ?? 0;
          const passFailed = counts.pass_total ?? 0;
          
          statsData.total_dribbles = (existingStats?.total_dribbles ?? 0) + dribbleSuccess + dribbleFailed;
          statsData.total_passes = (existingStats?.total_passes ?? 0) + passSuccess + passFailed;
        }

        // Upsert with the new totals
        const { error: upsertError } = await supabase
          .from("player_stats")
          .upsert(
            {
              player_id: mp.player_id,
              competition_id: match.competition_id,
              season_year: match.season_year,
              ...statsData,
            },
            {
              onConflict: "player_id,competition_id,season_year",
            }
          );

        if (upsertError) {
          console.error("Error upserting stats:", upsertError);
          throw upsertError;
        }

        // Recalculate player rating
        try {
          await supabase.rpc("update_player_auto_rating", {
            p_player_id: mp.player_id,
          });
        } catch (rpcError) {
          console.warn("Rating recalc failed:", rpcError);
        }

        appliedIds.push(mp.player_id);
      }

      // Update match status to applied
      const { error: statusError } = await supabase
        .from("matches")
        .update({ status: "applied" })
        .eq("id", match.id);

      if (statusError) throw statusError;

      return appliedIds;
    },
    onSuccess: (appliedIds) => {
      setAppliedPlayerIds(appliedIds);
      clearLocalDraft();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Estatísticas aplicadas com sucesso!", {
        description: `${appliedIds.length} jogadores atualizados`,
      });
    },
    onError: (error) => {
      console.error("Apply stats error:", error);
      toast.error("Erro ao aplicar estatísticas");
    },
  });

  if (!matchId) {
    return <Navigate to="/app/live-match/new" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Jogo não encontrado</h1>
        <Button asChild>
          <Link to="/app/live-match/new">Criar novo jogo</Link>
        </Button>
      </div>
    );
  }

  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const hasErrors = inconsistencies.some((i) => i.type === "error");
  const warningCount = inconsistencies.filter((i) => i.type === "warning").length;
  const errorCount = inconsistencies.filter((i) => i.type === "error").length;
  const infoCount = inconsistencies.filter((i) => i.type === "info").length;

  return (
    <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/live-match/${matchId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Revisão do Jogo</h1>
            <p className="text-muted-foreground">
              {competitionName} • vs {match.opponent_name}
            </p>
          </div>
        </div>
        
        {/* PDF Export Button */}
        <MatchSummaryPdfButton
          match={match}
          matchPlayers={matchPlayers}
          matchEvents={matchEvents}
          playerEventCounts={playerEventCounts}
          playerStatsMap={playerStatsMap}
        />
      </div>

      {/* Summary card with stats by half */}
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6">
          {/* Global summary */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="text-center p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{matchPlayers.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Jogadores</p>
            </div>
            <div className="text-center p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{matchEvents.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Eventos</p>
            </div>
            <div className="text-center p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-400">
                {matchEvents.filter((e) => e.event_type === "goal").length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Gols</p>
            </div>
            <div className="text-center p-4 sm:p-5 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-sky-400">
                {matchEvents.filter((e) => e.event_type === "assist").length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Assistências</p>
            </div>
          </div>

          {/* Stats by half */}
          <HalfStatsComparison events={matchEvents} matchPlayers={matchPlayers} />
        </CardContent>
      </Card>

      {/* Match Ratings - Shows after match is finished */}
      <MatchRatingsCard
        matchPlayers={matchPlayers}
        playerStatsMap={playerStatsMap}
        matchStatus={match.status}
      />

      {/* Post-Game Insights - Zone heatmap, quick indicators, strengths/improvements */}
      <PostGameInsightsCard
        matchPlayers={matchPlayers}
        playerStatsMap={playerStatsMap}
        matchStatus={match.status}
        matchDuration={match.duration_minutes}
        matchId={match.id}
        seasonYear={match.season_year}
        matchEvents={matchEvents}
      />

      {/* Substitution Stats */}
      <SubstitutionStatsCard
        matchPlayers={matchPlayers}
        matchEvents={matchEvents}
        matchDuration={match.duration_minutes}
        addedTime1H={match.added_time_first_half ?? 0}
        addedTime2H={match.added_time_second_half ?? 0}
      />

      {/* Event Distribution Chart */}
      <EventDistributionChart
        matchEvents={matchEvents}
        matchDuration={match.duration_minutes}
      />

      {/* Player Activity Heatmap */}
      <PlayerActivityHeatmap
        matchPlayers={matchPlayers}
        matchEvents={matchEvents}
        matchDuration={match.duration_minutes}
      />

      {/* Player Presence History */}
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            Histórico de Presença em Campo
          </CardTitle>
          <CardDescription className="text-sm">
            Intervalos de tempo em que cada atleta esteve em campo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <PlayerPresenceHistory matchId={matchId!} />
        </CardContent>
      </Card>

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
              Checklist de Inconsistências
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs sm:text-sm">
                  {errorCount} erro{errorCount > 1 ? "s" : ""}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs sm:text-sm border-amber-500 text-amber-500">
                  {warningCount} aviso{warningCount > 1 ? "s" : ""}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {infoCount} info{infoCount > 1 ? "s" : ""}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ScrollArea className="h-[280px] sm:h-[320px]">
              <div className="space-y-2 sm:space-y-3 pr-2">
                {inconsistencies.map((issue, idx) => (
                  <Alert
                    key={idx}
                    variant={issue.type === "error" ? "destructive" : "default"}
                    className={`p-3 sm:p-4 ${issue.type === "info" ? "border-zinc-800/40 bg-zinc-900/40" : issue.type === "warning" ? "border-amber-500/30 bg-amber-500/5" : ""}`}
                  >
                    {issue.type === "error" ? (
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : issue.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                    ) : (
                      <Info className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                    <AlertTitle className="text-sm sm:text-base">{issue.playerName}</AlertTitle>
                    <AlertDescription className="text-xs sm:text-sm">{issue.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Player stats preview */}
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
            Estatísticas por Jogador
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Valores que serão adicionados às estatísticas existentes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="h-[420px] sm:h-[480px]">
            <div className="space-y-3 sm:space-y-4 pr-2">
              {matchPlayers.map((mp) => {
                if (!mp.player) return null;
                const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
                const statEntries = Object.entries(counts)
                  .filter(([_, v]) => (v ?? 0) > 0)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
                const isApplied = appliedPlayerIds.includes(mp.player_id);
                const isEditing = editingPlayerId === mp.player_id;
                
                // Use standardized minutes calculation
                // CRITICAL: Calculate minutes from timeline (started, entered, exited)
                // Do NOT use mp.minutes_played as source of truth - it may be stale
                const hasSessionOverride = manualMinutes[mp.player_id] !== undefined;
                
                // Calculate from timeline only (ignoring any stale minutes_played value)
                const minutesInfo = calculateMinutesPlayed({
                  started: mp.started,
                  entered_minute: mp.entered_minute,
                  exited_minute: mp.exited_minute,
                  minutes_played: null, // Force calculation from timeline
                });
                
                // Display: session override > calculated from timeline
                const displayMinutes = hasSessionOverride 
                  ? manualMinutes[mp.player_id]
                  : minutesInfo.minutesPlayed;
                
                // Determine how minutes were calculated for display
                const getMinutesLabel = () => {
                  if (hasSessionOverride) return "editado";
                  // Show the timeline range instead of "(manual)"
                  return minutesInfo.rangeDisplay;
                };

                const handleStartEdit = () => {
                  setEditingPlayerId(mp.player_id);
                  setEditValue(displayMinutes.toString());
                };

                const handleConfirmEdit = () => {
                  const value = parseInt(editValue);
                  if (!isNaN(value) && value >= 0 && value <= match.duration_minutes) {
                    setManualMinutes(prev => ({ ...prev, [mp.player_id]: value }));
                  }
                  setEditingPlayerId(null);
                  setEditValue("");
                };

                const handleCancelEdit = () => {
                  setEditingPlayerId(null);
                  setEditValue("");
                };

                const handleResetMinutes = () => {
                  setManualMinutes(prev => {
                    const next = { ...prev };
                    delete next[mp.player_id];
                    return next;
                  });
                };

                return (
                  <div
                    key={mp.id}
                    className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border transition-all ${
                      isApplied 
                        ? "border-emerald-500/50 bg-emerald-500/5" 
                        : "border-zinc-800/40 bg-zinc-900/40"
                    }`}
                  >
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      <AvatarImage src={mp.player.photo_url || undefined} />
                      <AvatarFallback className="text-xs sm:text-sm">
                        {mp.player.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm sm:text-base">{mp.player.full_name}</p>
                        {isApplied && (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                        )}
                        {/* Rating Badge - show for finished/applied matches */}
                        {(match.status === "finished" || match.status === "applied") && (() => {
                          const stats = playerStatsMap[mp.player_id];
                          const playerRating = calculatePlayerMatchRating(stats, {
                            started: mp.started,
                            entered_minute: mp.entered_minute,
                            exited_minute: mp.exited_minute,
                            minutes_played: mp.minutes_played,
                          });
                          return <PlayerRatingBadge rating={playerRating} playerName={mp.player.full_name} size="sm" />;
                        })()}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {mp.player.position}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">•</span>
                        
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={match.duration_minutes}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-5 w-14 text-xs px-1 py-0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirmEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground">min</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={handleConfirmEdit}
                            >
                              <Check className="h-3 w-3 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Badge 
                              variant={hasSessionOverride ? "default" : "secondary"} 
                              className={`text-[10px] px-1.5 py-0 h-4 font-medium cursor-pointer hover:opacity-80 ${
                                hasSessionOverride ? "bg-primary" : ""
                              }`}
                              onClick={handleStartEdit}
                            >
                              {displayMinutes} min
                              <Pencil className="h-2.5 w-2.5 ml-1" />
                            </Badge>
                            <span className="text-[10px] text-muted-foreground italic">
                              ({getMinutesLabel()})
                            </span>
                            {hasSessionOverride && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1"
                                onClick={handleResetMinutes}
                                title="Resetar para valor calculado"
                              >
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                        {/* Derived stat: Ações com a Bola - always show first */}
                        {(() => {
                          const stats = playerStatsMap[mp.player_id];
                          const ballActions = stats ? calculateBallActionsFromMatchStats(stats) : 0;
                          return ballActions > 0 ? (
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] sm:text-xs px-2 py-0.5 bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                              title="Estatística derivada automaticamente"
                            >
                              Ações com a Bola: {ballActions}
                            </Badge>
                          ) : null;
                        })()}
                        {statEntries.length === 0 && !(() => {
                          const stats = playerStatsMap[mp.player_id];
                          const ballActions = stats ? calculateBallActionsFromMatchStats(stats) : 0;
                          return ballActions > 0;
                        })() ? (
                          <Badge variant="outline" className="text-xs sm:text-sm">
                            Sem estatísticas
                          </Badge>
                        ) : (
                          statEntries.slice(0, 8).map(([type, value]) => (
                            <Badge 
                              key={type} 
                              variant="secondary" 
                              className="text-[10px] sm:text-xs px-2 py-0.5"
                            >
                              {EVENT_LABELS[type as MatchEventType] || type}: +{value}
                            </Badge>
                          ))
                        )}
                        {statEntries.length > 8 && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5">
                            +{statEntries.length - 8} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                      asChild
                    >
                      <Link to={`/app/players/${mp.player_id}`} target="_blank">
                        <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-4 bg-zinc-950/95 backdrop-blur-lg p-4 sm:p-5 -mx-4 rounded-xl border border-zinc-800/40 shadow-xl">
        <Button variant="outline" asChild className="flex-1 h-11 sm:h-12 text-sm sm:text-base">
          <Link to={`/app/live-match/${matchId}`}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Voltar e Corrigir
          </Link>
        </Button>

        {match.status !== "applied" && (
          <Button
            onClick={() => applyStats.mutate()}
            disabled={applyStats.isPending || hasErrors}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 sm:h-12 text-sm sm:text-base"
            size="lg"
          >
            {applyStats.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2" />
                Aplicando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Aplicar Estatísticas
              </>
            )}
          </Button>
        )}

        {match.status === "applied" && (
          <div className="flex-1 flex items-center justify-center gap-2 p-4 sm:p-5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="font-medium text-sm sm:text-base">Estatísticas Aplicadas!</span>
          </div>
        )}
      </div>

      {/* Success message with links */}
      {match.status === "applied" && appliedPlayerIds.length > 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-5 sm:py-6 px-4 sm:px-6">
            <p className="text-sm sm:text-base text-center text-muted-foreground mb-4">
              Os ratings dos jogadores foram recalculados automaticamente.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {matchPlayers.slice(0, 5).map((mp) => (
                mp.player && (
                  <Button key={mp.id} variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                    <Link to={`/app/players/${mp.player_id}`}>
                      Ver {mp.player.full_name.split(" ")[0]}
                    </Link>
                  </Button>
                )
              ))}
              {matchPlayers.length > 5 && (
                <Badge variant="outline" className="text-xs sm:text-sm">+{matchPlayers.length - 5} jogadores</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
