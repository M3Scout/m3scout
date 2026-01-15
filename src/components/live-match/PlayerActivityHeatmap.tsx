import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame } from "lucide-react";

interface MatchPlayer {
  id: string;
  player_id: string;
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  is_removed?: boolean | null;
  player?: {
    id: string;
    full_name: string;
    position: string;
    photo_url: string | null;
  } | null;
}

interface MatchEvent {
  id: string;
  event_type: string;
  player_id: string;
  minute: number | null;
}

interface PlayerActivityHeatmapProps {
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  matchDuration: number;
}

// Event labels for tooltip
const EVENT_LABELS: Record<string, string> = {
  goal: "Gol",
  assist: "Assistência",
  shot: "Chute",
  shot_on_target: "Chute no gol",
  key_pass: "Passe decisivo",
  chance_created: "Chance criada",
  dribble_success: "Drible certo",
  dribble_attempt: "Drible tentado",
  tackle: "Desarme",
  interception: "Interceptação",
  recovery: "Recuperação",
  clearance: "Corte",
  duel_won: "Duelo ganho",
  duel_total: "Duelo total",
  aerial_duel_won: "Aéreo ganho",
  yellow: "Amarelo",
  red: "Vermelho",
  foul_committed: "Falta cometida",
  foul_suffered: "Falta sofrida",
  pass_success: "Passe certo",
  pass_total: "Passe total",
  possession_lost: "Bola perdida",
  save: "Defesa",
  goal_conceded: "Gol sofrido",
  penalty_saved: "Pênalti defendido",
  box_save: "Defesa na área",
  punch: "Soco",
  high_claim: "Bola alta",
  sweeper_action: "Saída do gol",
};

// Interval size in minutes for the heatmap
const INTERVAL_SIZE = 5;

export function PlayerActivityHeatmap({
  matchPlayers,
  matchEvents,
  matchDuration,
}: PlayerActivityHeatmapProps) {
  // Calculate intervals
  const intervals = useMemo(() => {
    const count = Math.ceil(matchDuration / INTERVAL_SIZE);
    return Array.from({ length: count }, (_, i) => ({
      start: i * INTERVAL_SIZE,
      end: Math.min((i + 1) * INTERVAL_SIZE, matchDuration),
      label: `${i * INTERVAL_SIZE}'`,
    }));
  }, [matchDuration]);

  // Build heatmap data per player
  const playerHeatmapData = useMemo(() => {
    const activePlayers = matchPlayers.filter(
      (mp) => mp.player && !mp.is_removed
    );

    return activePlayers.map((mp) => {
      const playerEvents = matchEvents.filter(
        (e) => e.player_id === mp.player_id && e.minute !== null
      );

      // Count events per interval
      const intervalCounts = intervals.map((interval) => {
        const eventsInInterval = playerEvents.filter(
          (e) => e.minute! >= interval.start && e.minute! < interval.end
        );

        // Check if player was on field during this interval
        const onFieldStart = mp.started ? 0 : (mp.entered_minute ?? matchDuration);
        const onFieldEnd = mp.exited_minute ?? matchDuration;
        const wasOnField = interval.start < onFieldEnd && interval.end > onFieldStart;

        return {
          count: eventsInInterval.length,
          events: eventsInInterval,
          wasOnField,
          interval,
        };
      });

      // Find max for this player to normalize
      const maxCount = Math.max(...intervalCounts.map((ic) => ic.count), 1);
      const totalEvents = playerEvents.length;

      return {
        player: mp,
        intervalCounts,
        maxCount,
        totalEvents,
      };
    }).sort((a, b) => b.totalEvents - a.totalEvents);
  }, [matchPlayers, matchEvents, intervals]);

  // Global max for color scaling
  const globalMax = useMemo(() => {
    return Math.max(...playerHeatmapData.map((p) => p.maxCount), 1);
  }, [playerHeatmapData]);

  // Get intensity color
  const getIntensityColor = (count: number, wasOnField: boolean) => {
    if (!wasOnField) return "bg-muted/30";
    if (count === 0) return "bg-muted/50";
    
    const intensity = count / globalMax;
    
    if (intensity >= 0.8) return "bg-red-500";
    if (intensity >= 0.6) return "bg-orange-500";
    if (intensity >= 0.4) return "bg-yellow-500";
    if (intensity >= 0.2) return "bg-green-500";
    return "bg-green-500/50";
  };

  if (matchEvents.length === 0 || playerHeatmapData.length === 0) {
    return null;
  }

  const halfTimeInterval = Math.floor((matchDuration / 2) / INTERVAL_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Mapa de Atividade
        </CardTitle>
        <CardDescription>
          Intensidade de eventos por jogador a cada {INTERVAL_SIZE} minutos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Menos ativo</span>
            <div className="flex gap-0.5">
              <div className="w-4 h-4 rounded bg-green-500/50" />
              <div className="w-4 h-4 rounded bg-green-500" />
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <div className="w-4 h-4 rounded bg-orange-500" />
              <div className="w-4 h-4 rounded bg-red-500" />
            </div>
            <span>Mais ativo</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded bg-muted/30 border border-dashed border-muted-foreground/30" />
            <span>Fora de campo</span>
          </div>
        </div>

        {/* Time axis header */}
        <div className="flex items-center gap-2">
          <div className="w-[140px] shrink-0" /> {/* Spacer for player column */}
          <div className="flex-1 flex">
            {intervals.map((interval, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center text-[10px] text-muted-foreground ${
                  idx === halfTimeInterval ? "border-l-2 border-muted-foreground/50 pl-1" : ""
                }`}
              >
                {idx % 3 === 0 ? interval.label : ""}
              </div>
            ))}
          </div>
          <div className="w-12 shrink-0 text-center text-[10px] text-muted-foreground font-medium">
            Total
          </div>
        </div>

        {/* Heatmap rows */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 pr-3">
            <TooltipProvider delayDuration={100}>
              {playerHeatmapData.map(({ player, intervalCounts, totalEvents }) => {
                if (!player.player) return null;

                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 py-1"
                  >
                    {/* Player info */}
                    <div className="w-[140px] shrink-0 flex items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={player.player.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {player.player.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {player.player.full_name.split(" ").slice(-1)[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {player.player.position}
                        </p>
                      </div>
                    </div>

                    {/* Heatmap cells */}
                    <div className="flex-1 flex gap-0.5">
                      {intervalCounts.map((ic, idx) => (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex-1 h-6 rounded-sm cursor-default transition-colors ${getIntensityColor(
                                ic.count,
                                ic.wasOnField
                              )} ${
                                idx === halfTimeInterval
                                  ? "border-l-2 border-background"
                                  : ""
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <div className="text-xs">
                              <p className="font-medium">
                                {ic.interval.start}' - {ic.interval.end}'
                              </p>
                              {!ic.wasOnField ? (
                                <p className="text-muted-foreground">
                                  Fora de campo
                                </p>
                              ) : ic.count === 0 ? (
                                <p className="text-muted-foreground">
                                  Sem eventos
                                </p>
                              ) : (
                                <div className="mt-1 space-y-0.5">
                                  <p className="text-muted-foreground">
                                    {ic.count} evento{ic.count > 1 ? "s" : ""}
                                  </p>
                                  {ic.events.slice(0, 5).map((e, i) => (
                                    <p key={i} className="text-muted-foreground">
                                      • {EVENT_LABELS[e.event_type] || e.event_type}
                                    </p>
                                  ))}
                                  {ic.events.length > 5 && (
                                    <p className="text-muted-foreground italic">
                                      +{ic.events.length - 5} mais
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Total events */}
                    <div className="w-12 shrink-0 text-center">
                      <Badge
                        variant={totalEvents > 0 ? "secondary" : "outline"}
                        className="text-[10px] px-1.5"
                      >
                        {totalEvents}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </TooltipProvider>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
