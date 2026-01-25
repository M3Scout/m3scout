import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, Clock, ArrowDown, ArrowUp, Timer, Download } from "lucide-react";
import { useExportPng } from "@/hooks/useExportPng";
import { calculateMinutesPlayed, getMinutesPlayedPercent, STANDARD_MATCH_DURATION } from "@/lib/minutesPlayed";

interface MatchPlayer {
  id: string;
  player_id: string;
  started: boolean;
  is_on_field: boolean;
  is_removed?: boolean | null;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played: number | null;
  position_template: string;
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
  player_in_id?: string | null;
  minute: number | null;
  display_minute: string | null;
  half: number | null;
}

interface SubstitutionStatsCardProps {
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  matchDuration: number;
  addedTime1H?: number;
  addedTime2H?: number;
}

interface SubstitutionInfo {
  minute: number;
  displayMinute: string;
  half: number;
  playerOut: MatchPlayer;
  playerIn: MatchPlayer;
}

interface PlayerTimeInfo {
  player: MatchPlayer;
  minutesPlayed: number;
  minutesPlayedTotal: number;
  started: boolean;
  enteredMinute: number | null;
  exitedMinute: number | null;
  wasSubstitutedIn: boolean;
  wasSubstitutedOut: boolean;
  rangeDisplay: string;
  rangeDisplayTotal: string;
  endMinute: number;
  hasAddedTime: boolean;
}

export function SubstitutionStatsCard({
  matchPlayers,
  matchEvents,
  matchDuration,
  addedTime1H = 0,
  addedTime2H = 0,
}: SubstitutionStatsCardProps) {
  const hasMatchAddedTime = addedTime1H > 0 || addedTime2H > 0;
  const matchContext = {
    baseDuration: matchDuration,
    addedTime1H,
    addedTime2H,
  };
  // Get all substitution events
  const substitutions = useMemo<SubstitutionInfo[]>(() => {
    const subEvents = matchEvents.filter((e) => e.event_type === "substitution");
    
    return subEvents
      .map((event) => {
        const playerOut = matchPlayers.find((mp) => mp.player_id === event.player_id);
        const playerIn = matchPlayers.find((mp) => mp.player_id === event.player_in_id);
        
        if (!playerOut || !playerIn) return null;
        
        return {
          minute: event.minute ?? 0,
          displayMinute: event.display_minute || `${event.minute}'`,
          half: event.half ?? 1,
          playerOut,
          playerIn,
        };
      })
      .filter((sub): sub is SubstitutionInfo => sub !== null)
      .sort((a, b) => a.minute - b.minute);
  }, [matchEvents, matchPlayers]);

  // Calculate time on field for each player using standardized logic
  const playerTimeStats = useMemo<PlayerTimeInfo[]>(() => {
    return matchPlayers
      .filter((mp) => mp.player && !mp.is_removed)
      .map((mp) => {
        const info = calculateMinutesPlayed(
          {
            started: mp.started,
            entered_minute: mp.entered_minute,
            exited_minute: mp.exited_minute,
            minutes_played: mp.minutes_played,
          },
          matchContext
        );
        
        const wasSubstitutedIn = mp.entered_minute !== null && !mp.started;
        const wasSubstitutedOut = mp.exited_minute !== null;
        
        return {
          player: mp,
          minutesPlayed: info.minutesPlayed,
          minutesPlayedTotal: info.minutesPlayedTotal,
          started: mp.started,
          enteredMinute: mp.entered_minute,
          exitedMinute: mp.exited_minute,
          wasSubstitutedIn,
          wasSubstitutedOut,
          rangeDisplay: info.rangeDisplay,
          rangeDisplayTotal: info.rangeDisplayTotal,
          endMinute: info.endMinute,
          hasAddedTime: info.hasAddedTime,
        };
      })
      .sort((a, b) => b.minutesPlayed - a.minutesPlayed);
  }, [matchPlayers, matchContext]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalSubs = substitutions.length;
    const firstHalfSubs = substitutions.filter((s) => s.half === 1).length;
    const secondHalfSubs = substitutions.filter((s) => s.half === 2).length;
    
    const starters = matchPlayers.filter((mp) => mp.started && !mp.is_removed);
    const playersUsed = matchPlayers.filter((mp) => 
      !mp.is_removed && (mp.started || mp.entered_minute !== null)
    );
    
    const avgMinutes = playerTimeStats.length > 0
      ? Math.round(playerTimeStats.reduce((sum, p) => sum + p.minutesPlayed, 0) / playerTimeStats.length)
      : 0;
    
    return {
      totalSubs,
      firstHalfSubs,
      secondHalfSubs,
      startersCount: starters.length,
      playersUsedCount: playersUsed.length,
      avgMinutes,
    };
  }, [substitutions, matchPlayers, playerTimeStats]);

  const cardRef = useRef<HTMLDivElement>(null);
  const { exportToPng, isExporting } = useExportPng({ filename: "substituicoes" });

  if (matchPlayers.length === 0) {
    return null;
  }

  return (
    <Card ref={cardRef} data-export-target className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              Substituições e Tempo em Campo
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {summaryStats.totalSubs} substituição{summaryStats.totalSubs !== 1 ? "ões" : ""} • 
              {summaryStats.playersUsedCount} jogadores utilizados
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPng(cardRef.current)}
            disabled={isExporting}
            className="shrink-0 self-start sm:self-auto"
          >
            <Download className="h-4 w-4 mr-1" />
            {isExporting ? "..." : "PNG"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6 p-4 sm:p-6">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="text-center p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
            <p className="text-2xl sm:text-3xl font-bold">{summaryStats.totalSubs}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Substituições</p>
          </div>
          <div className="text-center p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
            <p className="text-2xl sm:text-3xl font-bold">{summaryStats.startersCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Titulares</p>
          </div>
          <div className="text-center p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
            <p className="text-2xl sm:text-3xl font-bold">{summaryStats.playersUsedCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Jogadores</p>
          </div>
          <div className="text-center p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
            <p className="text-2xl sm:text-3xl font-bold">{summaryStats.avgMinutes}'</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Média Min.</p>
          </div>
        </div>

        {/* Substitutions Timeline */}
        {substitutions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm sm:text-base font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
              Timeline de Substituições
            </h4>
            <div className="space-y-2 sm:space-y-3">
              {substitutions.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/60"
                >
                  <Badge variant="outline" className="shrink-0 font-mono text-xs sm:text-sm px-2 sm:px-3">
                    {sub.displayMinute}
                  </Badge>
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Player Out */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                      <ArrowDown className="h-4 w-4 text-red-500 shrink-0" />
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                        <AvatarImage src={sub.playerOut.player?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px] sm:text-xs">
                          {sub.playerOut.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm truncate">
                        {sub.playerOut.player?.full_name.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                    
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                    
                    {/* Player In */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                      <ArrowUp className="h-4 w-4 text-emerald-500 shrink-0" />
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                        <AvatarImage src={sub.playerIn.player?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px] sm:text-xs">
                          {sub.playerIn.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm truncate">
                        {sub.playerIn.player?.full_name.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                    {sub.half === 1 ? "1T" : "2T"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time on Field List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tempo em Campo por Jogador
          </h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1.5 pr-3">
              {playerTimeStats.map((stat) => {
                if (!stat.player.player) return null;
                
                const percentPlayed = getMinutesPlayedPercent(stat.minutesPlayed);
                
                return (
                  <div
                    key={stat.player.id}
                    className="flex items-center gap-2 p-2 rounded-lg border"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={stat.player.player.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {stat.player.player.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {stat.player.player.full_name}
                        </span>
                        {stat.started && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                            TIT
                          </Badge>
                        )}
                        {stat.wasSubstitutedIn && (
                          <ArrowUp className="h-3 w-3 text-green-500 shrink-0" />
                        )}
                        {stat.wasSubstitutedOut && (
                          <ArrowDown className="h-3 w-3 text-red-500 shrink-0" />
                        )}
                      </div>
                      
                      {/* Time bar */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(percentPlayed, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-8 text-right">
                          {percentPlayed}%
                        </span>
                      </div>
                      
                      {/* Entry/Exit info - show regulatory range with total if different */}
                      {stat.rangeDisplay !== "—" && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {stat.hasAddedTime ? stat.rangeDisplayTotal : stat.rangeDisplay}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{stat.minutesPlayed} min</p>
                      <p className="text-[9px] text-muted-foreground">(regulamentar)</p>
                      {stat.hasAddedTime && stat.minutesPlayedTotal > stat.minutesPlayed && (
                        <p className="text-[9px] text-muted-foreground/70">
                          c/ acrés: {stat.minutesPlayedTotal} min
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
