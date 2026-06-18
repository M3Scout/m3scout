import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { calculateBallActionsFromMatchStats } from "@/lib/derivedBallActions";
import { normalizeMatchStats, type RawMatchStats } from "@/lib/normalizeMatchStats";
import { EVENT_LABELS_PTBR } from "@/lib/eventLabels";
import {
  logApplyBefore,
  logApplyDelta,
  logApplyAfter,
  logApplySkipped,
  logApplySummary,
  assertIdempotencyNoChange,
  assertDeltaAppliedCorrectly,
  validateInvariants,
  createStatsSnapshot,
} from "@/lib/applyStatsInstrumentation";
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
import { PlayerPresenceHistory } from "@/components/live-match/PlayerPresenceHistory";
import { MatchSummaryPdfButton } from "@/components/live-match/MatchSummaryPdfButton";
import { MatchRatingsCard } from "@/components/live-match/MatchRatingsCard";
import { PlayerRatingBadge } from "@/components/live-match/PlayerRatingBadge";
import { PostGameInsightsCard } from "@/components/live-match/PostGameInsightsCard";
import { calculateMinutesPlayed, STANDARD_MATCH_DURATION } from "@/lib/minutesPlayed";
import { persistedRatingToResult, noRatingResult } from "@/lib/matchRatingEngine";
import { calculateMinutesPlayed as calcMinutesForRating } from "@/lib/minutesPlayed";
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const CARD_BG     = "#161618";
const CARD_BORDER = "rgba(255,255,255,0.10)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";
const ACCENT      = "#ec4525";
const GREEN       = "#2DCE8A";
const AMBER       = "#f59e0b";

// ── Section wrapper ────────────────────────────────────────────────────────────
function SectionCard({ icon, title, count, accentBorder, children }: {
  icon?: React.ReactNode; title: string; count?: string;
  accentBorder?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: accentBorder ?? CARD_BORDER }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="font-display font-semibold text-[15px]" style={{ color: TEXT }}>{title}</span>
        </div>
        {count && <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: MUTED }}>{count}</span>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

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

// Event type labels for display - use centralized labels
const EVENT_LABELS: Partial<Record<MatchEventType, string>> = EVENT_LABELS_PTBR;

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

  // Apply stats mutation - IDEMPOTENT: prevents duplicate applications
  // INSTRUMENTED: logs before/after, asserts idempotency and invariants (DEV only)
  // 
  // CRITICAL FIX: Apply does NOT write to player_stats anymore!
  // Live match data lives ONLY in match_player_stats (already populated during the game).
  // This prevents duplication with manual_player_stats.
  const applyStats = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Jogo não encontrado");

      const alreadyApplied = match.status === "applied";

      // IDEMPOTENCY CHECK: If match is already applied, just rebuild ratings
      if (alreadyApplied) {
        logApplySkipped(match.id, "all", "all players", "Match already applied");
        logApplySummary(match.id, match.status, matchPlayers.length, 0, matchPlayers.length, 0);
        
        const { rebuildSingleMatchRatings } = await import("@/lib/rebuildMatchRatings");
        await rebuildSingleMatchRatings(match.id);
        return matchPlayers.map(mp => mp.player_id);
      }

      const appliedIds: string[] = [];
      const durationMinutes = match.duration_minutes;

      for (const mp of matchPlayers) {
        const playerName = mp.player?.full_name ?? "Unknown";
        
        // Use manual minutes if set, otherwise calculate automatically
        const minutesPlayed = manualMinutes[mp.player_id] ?? calculateMinutesPlayedForPlayer(mp, durationMinutes);

        // Update match_players with calculated minutes (persisted source of truth for minutes)
        const { error: mpUpdateError } = await supabase
          .from("match_players")
          .update({ minutes_played: minutesPlayed })
          .eq("id", mp.id);

        if (mpUpdateError) {
          console.warn("Error updating match_players minutes:", mpUpdateError);
        }

        // Log what we're doing
        if (import.meta.env.DEV) {
          console.log(`[APPLY] ${playerName}: ${minutesPlayed} min - stats in match_player_stats (no player_stats write)`);
        }

        // Recalculate player auto rating
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

      // CRITICAL: Rebuild ratings for this match to persist them
      const { rebuildSingleMatchRatings } = await import("@/lib/rebuildMatchRatings");
      await rebuildSingleMatchRatings(match.id);

      // === INSTRUMENTATION: Log SUMMARY ===
      logApplySummary(match.id, "applied", matchPlayers.length, appliedIds.length, 0, 0);

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
    return <Navigate to="/dashboard/aovivo/novo" replace />;
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
          <Link to="/dashboard/aovivo/novo">Criar novo jogo</Link>
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
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/aovivo/${matchId}`}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-zinc-800"
            style={{ color: MUTED }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="m3-page-title">Revisão do Jogo</h1>
            <p className="font-editorial-mono text-[11px] mt-0.5" style={{ color: MUTED }}>
              {competitionName} · vs {match.opponent_name}
            </p>
          </div>
        </div>
        <MatchSummaryPdfButton
          match={match}
          matchPlayers={matchPlayers}
          matchEvents={matchEvents}
          playerEventCounts={playerEventCounts}
          playerStatsMap={playerStatsMap}
        />
      </div>

      {/* ── Resumo ── */}
      <SectionCard icon={<Users className="w-4 h-4" style={{ color: MUTED }} />} title="Resumo">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: matchPlayers.length, label: "Jogadores", color: TEXT, bg: "rgba(255,255,255,0.03)", border: CARD_BORDER },
              { value: matchEvents.length,  label: "Eventos",   color: TEXT, bg: "rgba(255,255,255,0.03)", border: CARD_BORDER },
              { value: matchEvents.filter(e => e.event_type === "goal").length,   label: "Gols",         color: GREEN, bg: "rgba(45,206,138,0.07)",   border: "rgba(45,206,138,0.22)"  },
              { value: matchEvents.filter(e => e.event_type === "assist").length, label: "Assistências", color: "#38bdf8", bg: "rgba(56,189,248,0.07)", border: "rgba(56,189,248,0.22)" },
            ].map(({ value, label, color, bg, border }) => (
              <div key={label} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: bg, border: `1px solid ${border}` }}>
                <span className="font-display font-bold tabular-nums" style={{ fontSize: 34, color, lineHeight: 1 }}>{value}</span>
                <span className="font-editorial-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
              </div>
            ))}
          </div>
          <HalfStatsComparison events={matchEvents} matchPlayers={matchPlayers} />
        </div>
      </SectionCard>

      {/* ── Match Ratings ── */}
      <MatchRatingsCard
        matchPlayers={matchPlayers}
        playerStatsMap={playerStatsMap}
        matchStatus={match.status}
      />

      {/* ── Post-Game Insights ── */}
      <PostGameInsightsCard
        matchPlayers={matchPlayers}
        playerStatsMap={playerStatsMap}
        matchStatus={match.status}
        matchDuration={match.duration_minutes}
        matchId={match.id}
        seasonYear={match.season_year}
        matchEvents={matchEvents}
      />

      {/* ── Substituições ── */}
      <SubstitutionStatsCard
        matchPlayers={matchPlayers}
        matchEvents={matchEvents}
        matchDuration={match.duration_minutes}
        addedTime1H={match.added_time_first_half ?? 0}
        addedTime2H={match.added_time_second_half ?? 0}
        matchId={match.id}
      />

      {/* ── Distribuição de Eventos ── */}
      <EventDistributionChart
        matchEvents={matchEvents}
        matchDuration={match.duration_minutes}
      />

      {/* ── Presença em Campo ── */}
      <SectionCard
        icon={<Clock className="w-4 h-4" style={{ color: MUTED }} />}
        title="Histórico de Presença em Campo"
        count={`${matchPlayers.length} atleta${matchPlayers.length !== 1 ? "s" : ""}`}
      >
        <PlayerPresenceHistory matchId={matchId!} matchPlayers={matchPlayers} />
      </SectionCard>

      {/* ── Inconsistências ── */}
      {inconsistencies.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: "rgba(245,158,11,0.20)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4" style={{ color: AMBER }} />
              <span className="font-display font-semibold text-[15px]" style={{ color: TEXT }}>Checklist de Inconsistências</span>
            </div>
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border" style={{ color: ACCENT, borderColor: ACCENT }}>
                  {errorCount} erro{errorCount > 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border" style={{ color: AMBER, borderColor: AMBER }}>
                  {warningCount} aviso{warningCount > 1 ? "s" : ""}
                </span>
              )}
              {infoCount > 0 && (
                <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border" style={{ color: MUTED, borderColor: CARD_BORDER }}>
                  {infoCount} info
                </span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-2">
            {inconsistencies.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{
                  background: issue.type === "error" ? "rgba(236,69,37,0.07)" : issue.type === "warning" ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${issue.type === "error" ? "rgba(236,69,37,0.25)" : issue.type === "warning" ? "rgba(245,158,11,0.25)" : CARD_BORDER}`,
                }}
              >
                {issue.type === "error"
                  ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
                  : issue.type === "warning"
                  ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AMBER }} />
                  : <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: MUTED }} />}
                <div>
                  <p className="font-display font-semibold text-[12px]" style={{ color: TEXT }}>{issue.playerName}</p>
                  <p className="font-editorial-mono text-[11px] mt-0.5" style={{ color: MUTED }}>{issue.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Estatísticas por Jogador ── */}
      <SectionCard
        icon={<TrendingUp className="w-4 h-4" style={{ color: MUTED }} />}
        title="Estatísticas por Jogador"
        count={`${matchPlayers.length} atleta${matchPlayers.length !== 1 ? "s" : ""}`}
      >
        <div className="space-y-3">
          {matchPlayers.map((mp) => {
            if (!mp.player) return null;
            const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
            const statEntries = Object.entries(counts)
              .filter(([_, v]) => (v ?? 0) > 0)
              .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
            const isApplied = appliedPlayerIds.includes(mp.player_id);
            const isEditing = editingPlayerId === mp.player_id;

            const hasSessionOverride = manualMinutes[mp.player_id] !== undefined;
            const minutesInfo = calculateMinutesPlayed({
              started: mp.started,
              entered_minute: mp.entered_minute,
              exited_minute: mp.exited_minute,
              minutes_played: null,
            });
            const displayMinutes = hasSessionOverride ? manualMinutes[mp.player_id] : minutesInfo.minutesPlayed;
            const getMinutesLabel = () => hasSessionOverride ? "editado" : minutesInfo.rangeDisplay;

            const handleStartEdit = () => { setEditingPlayerId(mp.player_id); setEditValue(displayMinutes.toString()); };
            const handleConfirmEdit = () => {
              const value = parseInt(editValue);
              if (!isNaN(value) && value >= 0 && value <= match.duration_minutes) {
                setManualMinutes(prev => ({ ...prev, [mp.player_id]: value }));
              }
              setEditingPlayerId(null); setEditValue("");
            };
            const handleCancelEdit = () => { setEditingPlayerId(null); setEditValue(""); };
            const handleResetMinutes = () => { setManualMinutes(prev => { const next = { ...prev }; delete next[mp.player_id]; return next; }); };

            const stats = playerStatsMap[mp.player_id];
            const ballActions = stats ? calculateBallActionsFromMatchStats(stats) : 0;

            return (
              <div
                key={mp.id}
                className="flex items-start gap-3 p-4 rounded-xl border transition-colors duration-200"
                style={{
                  background: isApplied ? "rgba(45,206,138,0.07)" : "rgba(255,255,255,0.04)",
                  borderColor: isApplied ? "rgba(45,206,138,0.30)" : "rgba(255,255,255,0.09)",
                }}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={mp.player.photo_url || undefined} />
                  <AvatarFallback className="text-xs font-display">
                    {mp.player.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-display font-semibold text-[14px]" style={{ color: TEXT }}>{mp.player.full_name}</span>
                    {isApplied && <CheckCircle2 className="h-4 w-4" style={{ color: GREEN }} />}
                    {(match.status === "finished" || match.status === "applied") && (() => {
                      const ratingInfo = calcMinutesForRating({ started: mp.started, entered_minute: mp.entered_minute, exited_minute: mp.exited_minute, minutes_played: mp.minutes_played });
                      if (!stats?.rating || ratingInfo.minutesPlayed === 0) return <PlayerRatingBadge rating={noRatingResult()} playerName={mp.player.full_name} size="sm" />;
                      const playerRating = persistedRatingToResult(stats.rating, stats.rating_minutes_played ?? ratingInfo.minutesPlayed, stats.rating_minutes_factor ?? null);
                      return <PlayerRatingBadge rating={playerRating} playerName={mp.player.full_name} size="sm" />;
                    })()}
                  </div>

                  {/* Position + minutes */}
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>{mp.player.position}</span>
                    <span style={{ color: CARD_BORDER }}>·</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} max={match.duration_minutes} value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-5 w-14 text-xs px-1 py-0" autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleConfirmEdit(); if (e.key === "Escape") handleCancelEdit(); }}
                        />
                        <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>min</span>
                        <button onClick={handleConfirmEdit} className="flex items-center justify-center w-5 h-5 rounded hover:bg-zinc-800">
                          <Check className="h-3 w-3" style={{ color: GREEN }} />
                        </button>
                        <button onClick={handleCancelEdit} className="flex items-center justify-center w-5 h-5 rounded hover:bg-zinc-800">
                          <X className="h-3 w-3" style={{ color: MUTED }} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleStartEdit}
                          className="flex items-center gap-1 font-editorial-mono text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition-colors hover:bg-zinc-800"
                          style={{ color: hasSessionOverride ? GREEN : MUTED, borderColor: hasSessionOverride ? "rgba(45,206,138,0.4)" : CARD_BORDER }}
                        >
                          {displayMinutes} min <Pencil className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-editorial-mono text-[10px] italic" style={{ color: MUTED }}>({getMinutesLabel()})</span>
                        {hasSessionOverride && (
                          <button onClick={handleResetMinutes} className="flex items-center justify-center w-4 h-4 rounded hover:bg-zinc-800" title="Resetar">
                            <X className="h-2.5 w-2.5" style={{ color: MUTED }} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stat badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {ballActions > 0 && (
                      <span className="font-editorial-mono text-[10px] px-2 py-0.5 rounded-md border" style={{ color: "#22d3ee", borderColor: "rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.07)" }}>
                        Ações com a Bola: {ballActions}
                      </span>
                    )}
                    {statEntries.length === 0 && ballActions === 0 ? (
                      <span className="font-editorial-mono text-[10px] px-2 py-0.5 rounded-md border" style={{ color: MUTED, borderColor: CARD_BORDER }}>
                        Sem estatísticas
                      </span>
                    ) : (
                      statEntries
                        .filter(([type]) => type !== "ball_action")
                        .slice(0, 10)
                        .map(([type, value]) => (
                          <span key={type} className="font-editorial-mono text-[10px] px-2 py-0.5 rounded-md border" style={{ color: MUTED, borderColor: CARD_BORDER, background: "rgba(255,255,255,0.03)" }}>
                            {EVENT_LABELS[type as MatchEventType] || type}: +{value}
                          </span>
                        ))
                    )}
                    {statEntries.length > 10 && (
                      <span className="font-editorial-mono text-[10px] px-2 py-0.5 rounded-md border" style={{ color: MUTED, borderColor: CARD_BORDER }}>
                        +{statEntries.length - 10} mais
                      </span>
                    )}
                  </div>
                </div>

                <Link to={`/dashboard/atletas/${mp.player_id}`} target="_blank"
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors hover:bg-zinc-800"
                  style={{ color: MUTED }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Actions ── */}
      <div
        className="sticky bottom-4 flex flex-col sm:flex-row gap-3 rounded-xl border p-4"
        style={{ background: `${CARD_BG}f0`, backdropFilter: "blur(16px)", borderColor: CARD_BORDER, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
      >
        <Link
          to={`/dashboard/aovivo/${matchId}`}
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border font-editorial-mono text-[11px] uppercase tracking-wider transition-colors hover:bg-zinc-800/40"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: TEXT }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar e Corrigir
        </Link>

        {match.status !== "applied" && (
          <button
            onClick={() => applyStats.mutate()}
            disabled={applyStats.isPending || hasErrors}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-editorial-mono text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: GREEN, color: "#0a1a12" }}
          >
            {applyStats.isPending ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" /> Aplicando...</>
            ) : (
              <><Upload className="w-4 h-4" /> Aplicar Estatísticas</>
            )}
          </button>
        )}

        {match.status === "applied" && (
          <div className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-editorial-mono text-[11px] uppercase tracking-wider"
            style={{ background: "rgba(45,206,138,0.10)", color: GREEN, border: "1px solid rgba(45,206,138,0.30)" }}>
            <CheckCircle2 className="h-4 w-4" /> Estatísticas Aplicadas
          </div>
        )}
      </div>

      {/* ── Success links ── */}
      {match.status === "applied" && appliedPlayerIds.length > 0 && (
        <div className="rounded-xl border p-4 sm:p-5" style={{ background: "rgba(45,206,138,0.05)", borderColor: "rgba(45,206,138,0.20)" }}>
          <p className="font-editorial-mono text-[11px] text-center mb-4" style={{ color: MUTED }}>
            Os ratings dos jogadores foram recalculados automaticamente.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {matchPlayers.slice(0, 5).map((mp) =>
              mp.player && (
                <Link
                  key={mp.id}
                  to={`/dashboard/atletas/${mp.player_id}`}
                  className="font-editorial-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors hover:bg-zinc-800/40"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: TEXT }}
                >
                  Ver {mp.player.full_name.split(" ")[0]}
                </Link>
              )
            )}
            {matchPlayers.length > 5 && (
              <span className="font-editorial-mono text-[10px] px-3 py-1.5 rounded-lg border" style={{ color: MUTED, borderColor: CARD_BORDER }}>
                +{matchPlayers.length - 5} jogadores
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
