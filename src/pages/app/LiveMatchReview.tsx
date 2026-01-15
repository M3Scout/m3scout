import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
} from "lucide-react";

// Map match events to player_stats columns
const EVENT_TO_STAT_COLUMN: Partial<Record<MatchEventType, string>> = {
  goal: "goals",
  assist: "assists",
  shot: "shots",
  shot_on_target: "shots_on_target",
  key_pass: "key_passes",
  chance_created: "chances_created",
  dribble_success: "successful_dribbles",
  dribble_attempt: "total_dribbles",
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
  pass_total: "total_passes",
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
    isLoading,
    matchError,
    clearLocalDraft,
  } = useLiveMatch(matchId || "");

  // Detect inconsistencies (including GK-specific)
  const inconsistencies = useMemo<Inconsistency[]>(() => {
    if (!match) return [];
    const issues: Inconsistency[] = [];
    const duration = match.duration_minutes;

    matchPlayers.forEach((mp) => {
      if (!mp.player) return;
      const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
      const isGK = mp.position_template === "goalkeeper";

      // Common checks
      // Shots on target > Shots
      const shots = counts.shot ?? 0;
      const shotsOnTarget = counts.shot_on_target ?? 0;
      if (shotsOnTarget > shots) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Chutes no gol (${shotsOnTarget}) > Chutes totais (${shots})`,
        });
      }

      // Dribbles success > attempts
      const dribbleSuccess = counts.dribble_success ?? 0;
      const dribbleAttempt = counts.dribble_attempt ?? 0;
      if (dribbleSuccess > dribbleAttempt) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Dribles certos (${dribbleSuccess}) > Dribles tentados (${dribbleAttempt})`,
        });
      }

      // Duels won > total duels
      const duelsWon = counts.duel_won ?? 0;
      const duelsTotal = counts.duel_total ?? 0;
      if (duelsWon > duelsTotal) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Duelos ganhos (${duelsWon}) > Duelos totais (${duelsTotal})`,
        });
      }

      // Aerial duels won > total duels (warning only)
      const aerialWon = counts.aerial_duel_won ?? 0;
      if (aerialWon > duelsTotal && duelsTotal > 0) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "info",
          message: `Duelos aéreos ganhos (${aerialWon}) > Duelos totais (${duelsTotal})`,
        });
      }

      // Passes accurate > total
      const passesAcc = counts.pass_success ?? 0;
      const passesTotal = counts.pass_total ?? 0;
      if (passesAcc > passesTotal) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Passes certos (${passesAcc}) > Passes totais (${passesTotal})`,
        });
      }

      // Minutes checks
      const minutesPlayed = mp.minutes_played ?? duration;
      if (minutesPlayed > duration) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Minutos jogados (${minutesPlayed}) > Duração do jogo (${duration})`,
        });
      }

      // Entered/exited minute range check
      if (mp.entered_minute !== null && (mp.entered_minute < 0 || mp.entered_minute > duration)) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Minuto de entrada (${mp.entered_minute}) fora do intervalo 0-${duration}`,
        });
      }
      if (mp.exited_minute !== null && (mp.exited_minute < 0 || mp.exited_minute > duration)) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: `Minuto de saída (${mp.exited_minute}) fora do intervalo 0-${duration}`,
        });
      }

      // GK-specific checks
      if (isGK) {
        const cleanSheets = counts.clean_sheet ?? 0;
        const goalsConceded = counts.goal_conceded ?? 0;

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
        const saves = counts.save ?? 0;
        if (saves === 0 && goalsConceded > 2) {
          issues.push({
            playerId: mp.player_id,
            playerName: mp.player.full_name,
            type: "info",
            message: `${goalsConceded} gols sofridos sem nenhuma defesa registrada`,
          });
        }
      }

      // Player has no events
      const totalEvents = Object.values(counts).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
      if (totalEvents === 0) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "info",
          message: "Nenhuma estatística registrada",
        });
      }
    });

    return issues;
  }, [match, matchPlayers, playerEventCounts]);

  // Calculate minutes played for a player based on match data
  const calculateMinutesPlayed = (
    mp: typeof matchPlayers[0],
    durationMinutes: number
  ): number => {
    // If minutes_played is already set manually, use it
    if (mp.minutes_played !== null) {
      return mp.minutes_played;
    }

    const started = mp.started;
    const enteredMinute = mp.entered_minute;
    const exitedMinute = mp.exited_minute;

    if (started) {
      // Started the game
      if (exitedMinute !== null) {
        // Was substituted out
        return Math.max(0, exitedMinute);
      }
      // Played full match
      return durationMinutes;
    } else {
      // Did not start
      if (enteredMinute !== null) {
        if (exitedMinute !== null) {
          // Came in and went out
          return Math.max(0, exitedMinute - enteredMinute);
        }
        // Came in and stayed until the end
        return Math.max(0, durationMinutes - enteredMinute);
      }
      // Never entered (shouldn't happen normally, but safeguard)
      return 0;
    }
  };

  // Apply stats mutation - now properly INCREMENTS existing stats
  const applyStats = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Jogo não encontrado");

      const appliedIds: string[] = [];
      const durationMinutes = match.duration_minutes;

      for (const mp of matchPlayers) {
        const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
        
        // Use manual minutes if set, otherwise calculate automatically
        const minutesPlayed = manualMinutes[mp.player_id] ?? calculateMinutesPlayed(mp, durationMinutes);

        // First, try to get existing stats
        const { data: existingStats } = await supabase
          .from("player_stats")
          .select("*")
          .eq("player_id", mp.player_id)
          .eq("competition_id", match.competition_id)
          .eq("season_year", match.season_year)
          .maybeSingle();

        // Build update object with incremented values
        const statsData: Record<string, number> = {
          matches: (existingStats?.matches ?? 0) + 1,
          minutes: (existingStats?.minutes ?? 0) + minutesPlayed,
        };

        for (const [eventType, column] of Object.entries(EVENT_TO_STAT_COLUMN)) {
          const newValue = counts[eventType as MatchEventType] ?? 0;
          if (column) {
            const existingValue = existingStats?.[column as keyof typeof existingStats] ?? 0;
            statsData[column] = (typeof existingValue === 'number' ? existingValue : 0) + newValue;
          }
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
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
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

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-3xl font-bold">{matchPlayers.length}</p>
            <p className="text-sm text-muted-foreground">Jogadores</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-3xl font-bold">{matchEvents.length}</p>
            <p className="text-sm text-muted-foreground">Eventos</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-500/10">
            <p className="text-3xl font-bold text-green-400">
              {matchEvents.filter((e) => e.event_type === "goal").length}
            </p>
            <p className="text-sm text-muted-foreground">Gols</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-500/10">
            <p className="text-3xl font-bold text-blue-400">
              {matchEvents.filter((e) => e.event_type === "assist").length}
            </p>
            <p className="text-sm text-muted-foreground">Assistências</p>
          </div>
        </CardContent>
      </Card>

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Checklist de Inconsistências
            </CardTitle>
            <CardDescription className="flex items-center gap-3">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} erro{errorCount > 1 ? "s" : ""}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                  {warningCount} aviso{warningCount > 1 ? "s" : ""}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {infoCount} info{infoCount > 1 ? "s" : ""}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {inconsistencies.map((issue, idx) => (
                  <Alert
                    key={idx}
                    variant={issue.type === "error" ? "destructive" : "default"}
                    className={issue.type === "info" ? "border-muted" : ""}
                  >
                    {issue.type === "error" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : issue.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Info className="h-4 w-4 text-muted-foreground" />
                    )}
                    <AlertTitle className="text-sm">{issue.playerName}</AlertTitle>
                    <AlertDescription className="text-xs">{issue.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Player stats preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas por Jogador
          </CardTitle>
          <CardDescription>
            Valores que serão adicionados às estatísticas existentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {matchPlayers.map((mp) => {
                if (!mp.player) return null;
                const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
                const statEntries = Object.entries(counts)
                  .filter(([_, v]) => (v ?? 0) > 0)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
                const isApplied = appliedPlayerIds.includes(mp.player_id);
                const isEditing = editingPlayerId === mp.player_id;
                
                // Use manual minutes if set, otherwise calculate
                const hasManualOverride = manualMinutes[mp.player_id] !== undefined;
                const calculatedMinutes = calculateMinutesPlayed(mp, match.duration_minutes);
                const displayMinutes = manualMinutes[mp.player_id] ?? calculatedMinutes;
                
                // Determine how minutes were calculated for display
                const getMinutesLabel = () => {
                  if (hasManualOverride) return "editado";
                  if (mp.minutes_played !== null) return "manual";
                  if (mp.started && mp.exited_minute === null) return "titular completo";
                  if (mp.started && mp.exited_minute !== null) return `saiu ${mp.exited_minute}'`;
                  if (!mp.started && mp.entered_minute !== null) {
                    if (mp.exited_minute !== null) return `${mp.entered_minute}'-${mp.exited_minute}'`;
                    return `entrou ${mp.entered_minute}'`;
                  }
                  return "";
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
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      isApplied ? "border-green-500/50 bg-green-500/5" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={mp.player.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {mp.player.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{mp.player.full_name}</p>
                        {isApplied && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {mp.player.position}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        
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
                              variant={hasManualOverride ? "default" : "secondary"} 
                              className={`text-[10px] px-1.5 py-0 h-4 font-medium cursor-pointer hover:opacity-80 ${
                                hasManualOverride ? "bg-primary" : ""
                              }`}
                              onClick={handleStartEdit}
                            >
                              {displayMinutes} min
                              <Pencil className="h-2.5 w-2.5 ml-1" />
                            </Badge>
                            <span className="text-[10px] text-muted-foreground italic">
                              ({getMinutesLabel()})
                            </span>
                            {hasManualOverride && (
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
                      <div className="flex flex-wrap gap-1 mt-2">
                        {statEntries.length === 0 ? (
                          <Badge variant="outline" className="text-xs">
                            Sem estatísticas
                          </Badge>
                        ) : (
                          statEntries.slice(0, 8).map(([type, value]) => (
                            <Badge 
                              key={type} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0"
                            >
                              {EVENT_LABELS[type as MatchEventType] || type}: +{value}
                            </Badge>
                          ))
                        )}
                        {statEntries.length > 8 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{statEntries.length - 8} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      asChild
                    >
                      <Link to={`/app/players/${mp.player_id}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
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
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 -mx-4 rounded-lg border shadow-lg">
        <Button variant="outline" asChild className="flex-1">
          <Link to={`/app/live-match/${matchId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar e Corrigir
          </Link>
        </Button>

        {match.status !== "applied" && (
          <Button
            onClick={() => applyStats.mutate()}
            disabled={applyStats.isPending || hasErrors}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {applyStats.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Aplicando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Aplicar Estatísticas
              </>
            )}
          </Button>
        )}

        {match.status === "applied" && (
          <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-500 border border-green-500/30">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Estatísticas Aplicadas!</span>
          </div>
        )}
      </div>

      {/* Success message with links */}
      {match.status === "applied" && appliedPlayerIds.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-center text-muted-foreground mb-3">
              Os ratings dos jogadores foram recalculados automaticamente.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {matchPlayers.slice(0, 5).map((mp) => (
                mp.player && (
                  <Button key={mp.id} variant="outline" size="sm" asChild>
                    <Link to={`/app/players/${mp.player_id}`}>
                      Ver {mp.player.full_name.split(" ")[0]}
                    </Link>
                  </Button>
                )
              ))}
              {matchPlayers.length > 5 && (
                <Badge variant="outline">+{matchPlayers.length - 5} jogadores</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
