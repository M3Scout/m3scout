import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlayerHistoryComparisonProps {
  playerId: string;
  playerName: string;
  currentMatchId?: string;
  triggerClassName?: string;
  triggerContent?: ReactNode;
}

interface MatchHistory {
  matchId: string;
  matchDate: string;
  opponent: string;
  competition: string;
  events: Record<string, number>;
  minutesPlayed: number;
  started: boolean;
  notes: string | null;
}

// Event labels for display
const EVENT_LABELS: Record<string, string> = {
  goal: "Gols",
  assist: "Assist.",
  shot: "Final.",
  shot_on_target: "F. Gol",
  key_pass: "P. Dec.",
  tackle: "Desarmes",
  interception: "Interc.",
  recovery: "Recup.",
  duel_won: "D. Ganhos",
  yellow: "Amarelos",
  red: "Vermelhos",
  save: "Defesas",
  goal_conceded: "Gols Sof.",
  clean_sheet: "Clean S.",
};

export function PlayerHistoryComparison({
  playerId,
  playerName,
  currentMatchId,
  triggerClassName,
  triggerContent,
}: PlayerHistoryComparisonProps) {
  const [open, setOpen] = useState(false);
  // Fetch player's match history
  const { data: matchHistory, isLoading } = useQuery({
    queryKey: ["player-match-history", playerId],
    queryFn: async () => {
      // Get all matches this player participated in
      const { data: matchPlayers, error: mpError } = await supabase
        .from("match_players")
        .select(`
          id,
          match_id,
          started,
          minutes_played,
          entered_minute,
          exited_minute,
          notes,
          matches!inner (
            id,
            opponent_name,
            match_date,
            status,
            duration_minutes,
            competition:competitions (
              name,
              display_name
            )
          )
        `)
        .eq("player_id", playerId)
        .in("matches.status", ["finished", "applied"])
        .order("matches(match_date)", { ascending: false })
        .limit(10);

      if (mpError) throw mpError;

      // Get all events for these matches
      const matchIds = matchPlayers?.map((mp) => mp.match_id) || [];
      
      const { data: events, error: evError } = await supabase
        .from("match_events")
        .select("*")
        .eq("player_id", playerId)
        .in("match_id", matchIds);

      if (evError) throw evError;

      // Group events by match
      const eventsByMatch: Record<string, Record<string, number>> = {};
      events?.forEach((event) => {
        if (!eventsByMatch[event.match_id]) {
          eventsByMatch[event.match_id] = {};
        }
        const current = eventsByMatch[event.match_id][event.event_type] || 0;
        eventsByMatch[event.match_id][event.event_type] = current + event.value;
      });

      // Build history
      const history: MatchHistory[] = (matchPlayers || []).map((mp) => {
        const match = mp.matches as any;
        const comp = match?.competition;
        
        // Calculate minutes played
        let minutes = mp.minutes_played;
        if (minutes === null) {
          if (mp.started) {
            minutes = mp.exited_minute ?? match?.duration_minutes ?? 90;
          } else if (mp.entered_minute !== null) {
            minutes = (mp.exited_minute ?? match?.duration_minutes ?? 90) - mp.entered_minute;
          } else {
            minutes = 0;
          }
        }

        return {
          matchId: mp.match_id,
          matchDate: match?.match_date,
          opponent: match?.opponent_name || "Adversário",
          competition: comp?.display_name || comp?.name || "Competição",
          events: eventsByMatch[mp.match_id] || {},
          minutesPlayed: minutes,
          started: mp.started,
          notes: mp.notes,
        };
      });

      return history;
    },
    enabled: !!playerId,
  });

  // Calculate averages
  const calculateAverages = () => {
    if (!matchHistory || matchHistory.length === 0) return null;

    const totals: Record<string, number> = {};
    let totalMinutes = 0;
    let matchCount = 0;

    matchHistory.forEach((match) => {
      if (match.matchId === currentMatchId) return; // Exclude current match
      matchCount++;
      totalMinutes += match.minutesPlayed;
      
      Object.entries(match.events).forEach(([type, value]) => {
        totals[type] = (totals[type] || 0) + value;
      });
    });

    if (matchCount === 0) return null;

    const avgMinutes = Math.round(totalMinutes / matchCount);
    const averages: Record<string, number> = {};
    Object.entries(totals).forEach(([type, value]) => {
      averages[type] = Math.round((value / matchCount) * 10) / 10;
    });

    return { averages, avgMinutes, matchCount };
  };

  const stats = calculateAverages();

  // Get trend indicator
  const getTrend = (current: number, average: number) => {
    if (current > average * 1.2) return "up";
    if (current < average * 0.8) return "down";
    return "stable";
  };

  // Custom trigger for dropdown menu usage
  const trigger = triggerClassName && triggerContent ? (
    <div className={triggerClassName} onClick={() => setOpen(true)}>
      {triggerContent}
    </div>
  ) : (
    <Button variant="ghost" size="icon" className="h-8 w-8" title="Histórico">
      <BarChart3 className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Histórico: {playerName}
          </DialogTitle>
          <DialogDescription>
            Comparação de desempenho nos últimos jogos
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !matchHistory || matchHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum jogo anterior encontrado
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Averages section */}
              {stats && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    📊 Média dos últimos {stats.matchCount} jogos
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded bg-background">
                      <p className="text-lg font-bold">{stats.avgMinutes}'</p>
                      <p className="text-[10px] text-muted-foreground">Min/Jogo</p>
                    </div>
                    {Object.entries(stats.averages)
                      .filter(([type]) => EVENT_LABELS[type])
                      .slice(0, 5)
                      .map(([type, avg]) => (
                        <div key={type} className="text-center p-2 rounded bg-background">
                          <p className="text-lg font-bold">{avg}</p>
                          <p className="text-[10px] text-muted-foreground">{EVENT_LABELS[type]}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Match history list */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Últimos Jogos</h3>
                {matchHistory.map((match) => {
                  const isCurrentMatch = match.matchId === currentMatchId;
                  
                  return (
                    <div
                      key={match.matchId}
                      className={`p-3 rounded-lg border ${
                        isCurrentMatch ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            vs {match.opponent}
                            {isCurrentMatch && (
                              <Badge variant="default" className="ml-2 text-[10px]">
                                ATUAL
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.competition} •{" "}
                            {format(new Date(match.matchDate), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={match.started ? "secondary" : "outline"} className="text-[10px]">
                            {match.started ? "Titular" : "Reserva"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {match.minutesPlayed}'
                          </p>
                        </div>
                      </div>

                      {/* Events */}
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(match.events)
                          .filter(([type]) => EVENT_LABELS[type])
                          .map(([type, value]) => {
                            const avg = stats?.averages[type];
                            const trend = avg ? getTrend(value, avg) : "stable";
                            
                            return (
                              <Badge
                                key={type}
                                variant="outline"
                                className={`text-[10px] ${
                                  trend === "up"
                                    ? "border-green-500/50 text-green-500"
                                    : trend === "down"
                                    ? "border-red-500/50 text-red-500"
                                    : ""
                                }`}
                              >
                                {EVENT_LABELS[type]}: {value}
                                {trend === "up" && <TrendingUp className="h-2.5 w-2.5 ml-1" />}
                                {trend === "down" && <TrendingDown className="h-2.5 w-2.5 ml-1" />}
                                {trend === "stable" && <Minus className="h-2.5 w-2.5 ml-1" />}
                              </Badge>
                            );
                          })}
                        {Object.keys(match.events).filter((t) => EVENT_LABELS[t]).length === 0 && (
                          <span className="text-xs text-muted-foreground">Sem estatísticas</span>
                        )}
                      </div>

                      {/* Notes */}
                      {match.notes && (
                        <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                          📝 {match.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
