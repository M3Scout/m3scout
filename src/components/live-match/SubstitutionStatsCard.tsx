import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, Clock, ArrowDown, ArrowUp, Timer } from "lucide-react";

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
  started: boolean;
  enteredMinute: number | null;
  exitedMinute: number | null;
  wasSubstitutedIn: boolean;
  wasSubstitutedOut: boolean;
}

export function SubstitutionStatsCard({
  matchPlayers,
  matchEvents,
  matchDuration,
}: SubstitutionStatsCardProps) {
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

  // Calculate time on field for each player
  const playerTimeStats = useMemo<PlayerTimeInfo[]>(() => {
    return matchPlayers
      .filter((mp) => mp.player && !mp.is_removed)
      .map((mp) => {
        let minutesPlayed = 0;
        
        if (mp.minutes_played !== null) {
          minutesPlayed = mp.minutes_played;
        } else if (mp.started) {
          if (mp.exited_minute !== null) {
            minutesPlayed = mp.exited_minute;
          } else {
            minutesPlayed = matchDuration;
          }
        } else if (mp.entered_minute !== null) {
          if (mp.exited_minute !== null) {
            minutesPlayed = Math.max(0, mp.exited_minute - mp.entered_minute);
          } else {
            minutesPlayed = Math.max(0, matchDuration - mp.entered_minute);
          }
        }
        
        const wasSubstitutedIn = mp.entered_minute !== null && !mp.started;
        const wasSubstitutedOut = mp.exited_minute !== null;
        
        return {
          player: mp,
          minutesPlayed,
          started: mp.started,
          enteredMinute: mp.entered_minute,
          exitedMinute: mp.exited_minute,
          wasSubstitutedIn,
          wasSubstitutedOut,
        };
      })
      .sort((a, b) => b.minutesPlayed - a.minutesPlayed);
  }, [matchPlayers, matchDuration]);

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

  if (matchPlayers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Substituições e Tempo em Campo
        </CardTitle>
        <CardDescription>
          {summaryStats.totalSubs} substituição{summaryStats.totalSubs !== 1 ? "ões" : ""} • 
          {summaryStats.playersUsedCount} jogadores utilizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{summaryStats.totalSubs}</p>
            <p className="text-xs text-muted-foreground">Substituições</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{summaryStats.startersCount}</p>
            <p className="text-xs text-muted-foreground">Titulares</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{summaryStats.playersUsedCount}</p>
            <p className="text-xs text-muted-foreground">Jogadores</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{summaryStats.avgMinutes}'</p>
            <p className="text-xs text-muted-foreground">Média Min.</p>
          </div>
        </div>

        {/* Substitutions Timeline */}
        {substitutions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Timeline de Substituições
            </h4>
            <div className="space-y-2">
              {substitutions.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
                >
                  <Badge variant="outline" className="shrink-0 font-mono">
                    {sub.displayMinute}
                  </Badge>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Player Out */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <ArrowDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={sub.playerOut.player?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {sub.playerOut.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">
                        {sub.playerOut.player?.full_name.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                    
                    <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    
                    {/* Player In */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <ArrowUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={sub.playerIn.player?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {sub.playerIn.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">
                        {sub.playerIn.player?.full_name.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
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
                
                const percentPlayed = Math.round((stat.minutesPlayed / matchDuration) * 100);
                
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
                      
                      {/* Entry/Exit info */}
                      {(stat.enteredMinute !== null || stat.exitedMinute !== null) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {stat.started && stat.exitedMinute !== null && (
                            <span className="text-[10px] text-muted-foreground">
                              0' → {stat.exitedMinute}'
                            </span>
                          )}
                          {!stat.started && stat.enteredMinute !== null && (
                            <span className="text-[10px] text-muted-foreground">
                              {stat.enteredMinute}' → {stat.exitedMinute ?? matchDuration}'
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{stat.minutesPlayed}'</p>
                      <p className="text-[10px] text-muted-foreground">minutos</p>
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
