import { useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Users,
  TrendingUp,
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

interface Inconsistency {
  playerId: string;
  playerName: string;
  type: "warning" | "error";
  message: string;
}

export default function LiveMatchReview() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);

  const {
    match,
    matchPlayers,
    matchEvents,
    playerEventCounts,
    isLoading,
    matchError,
    updateMatchStatus,
    clearLocalDraft,
  } = useLiveMatch(matchId || "");

  // Detect inconsistencies
  const inconsistencies = useMemo<Inconsistency[]>(() => {
    const issues: Inconsistency[] = [];

    matchPlayers.forEach((mp) => {
      if (!mp.player) return;
      const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;

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

      // Player has no events
      const totalEvents = Object.values(counts).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
      if (totalEvents === 0) {
        issues.push({
          playerId: mp.player_id,
          playerName: mp.player.full_name,
          type: "warning",
          message: "Nenhuma estatística registrada",
        });
      }
    });

    return issues;
  }, [matchPlayers, playerEventCounts]);

  // Apply stats mutation
  const applyStats = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Jogo não encontrado");

      // For each player, aggregate events and update player_stats
      for (const mp of matchPlayers) {
        const counts = playerEventCounts[mp.player_id] || {};
        
        // Build update object with only mapped columns
        const statsUpdate: Record<string, number> = {
          matches: 1,
          minutes: mp.minutes_played ?? match.duration_minutes,
        };

        for (const [eventType, column] of Object.entries(EVENT_TO_STAT_COLUMN)) {
          const value = counts[eventType as MatchEventType] || 0;
          if (value > 0 && column) {
            statsUpdate[column] = value;
          }
        }

        // Upsert player_stats
        const { error: upsertError } = await supabase
          .from("player_stats")
          .upsert(
            {
              player_id: mp.player_id,
              competition_id: match.competition_id,
              season_year: match.season_year,
              ...statsUpdate,
            },
            {
              onConflict: "player_id,competition_id,season_year",
              ignoreDuplicates: false,
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
      }

      // Update match status to applied
      const { error: statusError } = await supabase
        .from("matches")
        .update({ status: "applied" })
        .eq("id", match.id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      clearLocalDraft();
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Estatísticas aplicadas com sucesso!");
      navigate("/app/live-match/new");
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
          <a href="/app/live-match/new">Criar novo jogo</a>
        </Button>
      </div>
    );
  }

  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const hasErrors = inconsistencies.some((i) => i.type === "error");

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <a href={`/app/live-match/${matchId}`}>
            <ArrowLeft className="h-5 w-5" />
          </a>
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
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-3xl font-bold">{matchPlayers.length}</p>
            <p className="text-sm text-muted-foreground">Jogadores</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-3xl font-bold">{matchEvents.length}</p>
            <p className="text-sm text-muted-foreground">Eventos</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-3xl font-bold">
              {matchEvents.filter((e) => e.event_type === "goal").length}
            </p>
            <p className="text-sm text-muted-foreground">Gols</p>
          </div>
        </CardContent>
      </Card>

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Inconsistências ({inconsistencies.length})
            </CardTitle>
            <CardDescription>
              Revise estes avisos antes de aplicar as estatísticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {inconsistencies.map((issue, idx) => (
                  <Alert
                    key={idx}
                    variant={issue.type === "error" ? "destructive" : "default"}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{issue.playerName}</AlertTitle>
                    <AlertDescription>{issue.message}</AlertDescription>
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
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {matchPlayers.map((mp) => {
                if (!mp.player) return null;
                const counts = (playerEventCounts[mp.player_id] || {}) as Partial<Record<MatchEventType, number>>;
                const statEntries = Object.entries(counts).filter(([_, v]) => (v ?? 0) > 0);

                return (
                  <div
                    key={mp.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={mp.player.photo_url || undefined} />
                      <AvatarFallback>
                        {mp.player.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{mp.player.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {mp.player.position}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {statEntries.length === 0 ? (
                          <Badge variant="outline" className="text-xs">
                            Sem estatísticas
                          </Badge>
                        ) : (
                          statEntries.map(([type, value]: [string, number | undefined]) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}: {value}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" asChild className="flex-1">
          <a href={`/app/live-match/${matchId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Jogo
          </a>
        </Button>

        {match.status !== "applied" && (
          <Button
            onClick={() => applyStats.mutate()}
            disabled={applyStats.isPending || hasErrors}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {applyStats.isPending ? (
              "Aplicando..."
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Aplicar Estatísticas
              </>
            )}
          </Button>
        )}

        {match.status === "applied" && (
          <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Estatísticas já aplicadas
          </div>
        )}
      </div>
    </div>
  );
}
