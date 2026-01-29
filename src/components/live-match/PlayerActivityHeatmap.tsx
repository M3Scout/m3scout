import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame, Download } from "lucide-react";
import { useExportPng } from "@/hooks/useExportPng";

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
  event_status?: string;
  count_in_stats?: boolean;
  player_id: string;
  minute: number | null;
  game_time_seconds: number | null;
  half: number | null;
}

interface PlayerActivityHeatmapProps {
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  matchDuration: number;
}

// Event labels for tooltip - Canonical mapping for all event types
// CRITICAL: pass_total in DB means FAILED passes, not total passes
// CRITICAL: dribbles_total in DB means FAILED dribbles, not total dribbles  
// CRITICAL: aerial_duel_total in DB means LOST aerial duels
const EVENT_LABELS: Record<string, string> = {
  // Attack
  goal: "Gol",
  assist: "Assistência",
  shot: "Finalização",
  shot_on_target: "Finalização no gol",
  shot_blocked: "Finalização bloqueada",
  offside: "Impedimento",
  
  // Creation/Passing
  key_pass: "Passe decisivo",
  chance_created: "Chance criada",
  pass_success: "Passe certo",
  pass_total: "Passe errado", // IMPORTANT: pass_total stores FAILED passes
  cross_success: "Cruzamento certo",
  cross_failed: "Cruzamento errado",
  
  // Dribbles/Possession
  dribble_success: "Drible certo",
  dribble_attempt: "Drible errado", // Failed dribble attempt
  possession_lost: "Bola perdida",
  
  // Defense
  tackle: "Desarme",
  interception: "Interceptação",
  recovery: "Recuperação",
  clearance: "Corte",
  was_dribbled: "Driblado",
  blocked_shot: "Chute bloqueado (def)",
  
  // Duels
  duel_won: "Duelo ganho",
  duel_total: "Duelo perdido", // duel_total stores LOST duels
  aerial_duel_won: "Aéreo ganho",
  aerial_duel_total: "Aéreo perdido", // aerial_duel_total stores LOST duels
  
  // Fouls/Cards
  yellow: "Amarelo",
  red: "Vermelho",
  foul_committed: "Falta cometida",
  foul_suffered: "Falta sofrida",
  
  // Goalkeeper
  save: "Defesa",
  goal_conceded: "Gol sofrido",
  penalty_saved: "Pênalti defendido",
  box_save: "Defesa na área",
  punch: "Soco",
  high_claim: "Bola alta",
  sweeper_action: "Saída do gol",
  
  // Meta events (excluded from heatmap but label for safety)
  player_on: "Entrou",
  player_off: "Saiu",
  substitution: "Substituição",
};

/**
 * Humanize snake_case event type as fallback
 * Example: "was_dribbled" -> "Was dribbled"
 */
function humanizeEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get human-readable label for an event type
 * Uses canonical labels first, then falls back to humanized snake_case
 */
function getEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] || humanizeEventType(eventType);
}

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

  // Event types to exclude from activity heatmap (meta/admin events)
  const EXCLUDED_EVENT_TYPES = ["player_on", "player_off", "substitution"];

  // Build heatmap data per player
  const playerHeatmapData = useMemo(() => {
    const activePlayers = matchPlayers.filter(
      (mp) => mp.player && !mp.is_removed
    );

    return activePlayers.map((mp) => {
      // Filter player events - exclude voided events and meta events
      const playerEvents = matchEvents.filter((e) => {
        if (e.player_id !== mp.player_id) return false;
        if (e.event_status === "voided") return false;
        if (e.count_in_stats === false) return false;
        if (EXCLUDED_EVENT_TYPES.includes(e.event_type)) return false;
        // Must have a valid time reference
        return e.game_time_seconds !== null || e.minute !== null;
      });

      // Count events per interval using game_time_seconds OR minute
      const intervalCounts = intervals.map((interval) => {
        const eventsInInterval = playerEvents.filter((e) => {
          // Calculate minute from game_time_seconds if available, otherwise use minute
          const eventMinute = e.game_time_seconds !== null 
            ? Math.floor(e.game_time_seconds / 60) 
            : e.minute;
          
          if (eventMinute === null) return false;
          return eventMinute >= interval.start && eventMinute < interval.end;
        });

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
  }, [matchPlayers, matchEvents, intervals, matchDuration]);

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

  const heatmapRef = useRef<HTMLDivElement>(null);
  const { exportToPng, isExporting } = useExportPng({ filename: "mapa-atividade" });

  if (matchEvents.length === 0 || playerHeatmapData.length === 0) {
    return null;
  }

  const halfTimeInterval = Math.floor((matchDuration / 2) / INTERVAL_SIZE);

  return (
    <Card ref={heatmapRef} data-export-target className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
              Mapa de Atividade
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Intensidade de eventos por jogador a cada {INTERVAL_SIZE} minutos
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPng(heatmapRef.current)}
            disabled={isExporting}
            className="shrink-0 self-start sm:self-auto"
          >
            <Download className="h-4 w-4 mr-1" />
            {isExporting ? "..." : "PNG"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6">
        {/* Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Menos ativo</span>
            <div className="flex gap-0.5 sm:gap-1">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-green-500/50" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-green-500" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-yellow-500" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-orange-500" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-red-500" />
            </div>
            <span>Mais ativo</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-zinc-800/50 border border-dashed border-zinc-600/30" />
            <span>Fora de campo</span>
          </div>
        </div>

        {/* Time axis header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-[100px] sm:w-[140px] lg:w-[160px] shrink-0" /> {/* Spacer for player column */}
          <div className="flex-1 flex">
            {intervals.map((interval, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground ${
                  idx === halfTimeInterval ? "border-l-2 border-muted-foreground/50 pl-1" : ""
                }`}
              >
                {idx % 3 === 0 ? interval.label : ""}
              </div>
            ))}
          </div>
          <div className="w-10 sm:w-12 lg:w-14 shrink-0 text-center text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground font-medium">
            Total
          </div>
        </div>

        {/* Heatmap rows */}
        <ScrollArea className="h-[350px] sm:h-[400px] lg:h-[450px]">
          <div className="space-y-1.5 sm:space-y-2 pr-3">
            <TooltipProvider delayDuration={100}>
              {playerHeatmapData.map(({ player, intervalCounts, totalEvents }) => {
                if (!player.player) return null;

                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2"
                  >
                    {/* Player info */}
                    <div className="w-[100px] sm:w-[140px] lg:w-[160px] shrink-0 flex items-center gap-2">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                        <AvatarImage src={player.player.photo_url || undefined} />
                        <AvatarFallback className="text-[10px] sm:text-xs">
                          {player.player.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {player.player.full_name.split(" ").slice(-1)[0]}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {player.player.position}
                        </p>
                      </div>
                    </div>

                    {/* Heatmap cells */}
                    <div className="flex-1 flex gap-0.5 sm:gap-1">
                      {intervalCounts.map((ic, idx) => (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex-1 h-6 sm:h-7 lg:h-8 rounded-sm cursor-default transition-colors ${getIntensityColor(
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
                                      • {getEventLabel(e.event_type)}
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
                    <div className="w-10 sm:w-12 lg:w-14 shrink-0 text-center">
                      <Badge
                        variant={totalEvents > 0 ? "secondary" : "outline"}
                        className="text-[10px] sm:text-xs px-1.5 sm:px-2"
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
