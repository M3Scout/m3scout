import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRightLeft, Clock, ArrowDown, ArrowUp, Timer, Download } from "lucide-react";
import { useExportPng } from "@/hooks/useExportPng";
import { calculateMinutesPlayed, getMinutesPlayedPercent, STANDARD_MATCH_DURATION } from "@/lib/minutesPlayed";
import { usePlayerFieldPresence } from "@/hooks/usePlayerFieldPresence";
import { getRegulationGameMinute } from "@/lib/formatters";

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

interface PresenceRecord {
  id: string;
  player_id: string;
  period: number;
  entered_at_seconds: number;
  exited_at_seconds: number | null;
  role: string;
}

interface SubstitutionStatsCardProps {
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  matchDuration: number;
  addedTime1H?: number;
  addedTime2H?: number;
  matchId?: string;
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
  matchId,
}: SubstitutionStatsCardProps) {
  const hasMatchAddedTime = addedTime1H > 0 || addedTime2H > 0;
  const matchContext = {
    baseDuration: matchDuration,
    addedTime1H,
    addedTime2H,
  };

  // Fetch player_field_presence as SOURCE OF TRUTH for minutes
  const { data: presenceRecordsRaw } = usePlayerFieldPresence(matchId);
  const presenceRecords = (presenceRecordsRaw ?? []) as unknown as PresenceRecord[];

  const END_OF_HALF_SECONDS = 45 * 60;

  // Build a map of player_id -> total minutes from presence records
  const presenceMinutesMap = useMemo(() => {
    const map: Record<string, { totalMinutes: number; started: boolean }> = {};
    for (const record of presenceRecords) {
      if (!map[record.player_id]) {
        map[record.player_id] = { totalMinutes: 0, started: record.role === "starter" };
      }
      if (record.role === "starter") {
        map[record.player_id].started = true;
      }
      // Use the same rounding/capping standard as the UI minute display
      const entryMin = getRegulationGameMinute(record.entered_at_seconds, record.period);
      const exitSeconds = Math.min(record.exited_at_seconds ?? END_OF_HALF_SECONDS, END_OF_HALF_SECONDS);
      const exitMin = getRegulationGameMinute(exitSeconds, record.period);
      const minutes = Math.max(0, exitMin - entryMin);
      map[record.player_id].totalMinutes += minutes;
    }
    return map;
  }, [presenceRecords]);

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
  // PRIORITY: Use player_field_presence if available, fallback to match_players calculation
  const playerTimeStats = useMemo<PlayerTimeInfo[]>(() => {
    return matchPlayers
      .filter((mp) => mp.player && !mp.is_removed)
      .map((mp) => {
        // Try to get minutes from presence records first (SOURCE OF TRUTH)
        const presenceData = presenceMinutesMap[mp.player_id];
        
        let minutesPlayed: number;
        let started: boolean;
        let rangeDisplay: string;
        
        if (presenceData && presenceData.totalMinutes > 0) {
          // Use presence-based data (more accurate)
          minutesPlayed = Math.min(presenceData.totalMinutes, STANDARD_MATCH_DURATION);
          started = presenceData.started;
          
          // Build range display from presence
          const playerRecords = presenceRecords.filter(r => r.player_id === mp.player_id);
          if (playerRecords.length > 0) {
            const firstEntry = Math.min(
              ...playerRecords.map(r => getRegulationGameMinute(r.entered_at_seconds, r.period))
            );
            const lastExit = Math.max(
              ...playerRecords.map(r => {
                const exitSeconds = Math.min(r.exited_at_seconds ?? END_OF_HALF_SECONDS, END_OF_HALF_SECONDS);
                return getRegulationGameMinute(exitSeconds, r.period);
              })
            );
            rangeDisplay = `${firstEntry}' → ${lastExit}'`;
          } else {
            rangeDisplay = "—";
          }
        } else {
          // Fallback to match_players calculation
          const info = calculateMinutesPlayed(
            {
              started: mp.started,
              entered_minute: mp.entered_minute,
              exited_minute: mp.exited_minute,
              minutes_played: null,
            },
            matchContext
          );
          minutesPlayed = info.minutesPlayed;
          started = mp.started;
          rangeDisplay = info.rangeDisplay;
        }
        
        const wasSubstitutedIn = mp.entered_minute !== null && !started;
        const wasSubstitutedOut = mp.exited_minute !== null;
        
        return {
          player: mp,
          minutesPlayed,
          minutesPlayedTotal: minutesPlayed,
          started,
          enteredMinute: mp.entered_minute,
          exitedMinute: mp.exited_minute,
          wasSubstitutedIn,
          wasSubstitutedOut,
          rangeDisplay,
          rangeDisplayTotal: rangeDisplay,
          endMinute: 90,
          hasAddedTime: hasMatchAddedTime,
        };
      })
      .sort((a, b) => b.minutesPlayed - a.minutesPlayed);
  }, [matchPlayers, matchContext, presenceMinutesMap, presenceRecords, hasMatchAddedTime]);

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
    <div ref={cardRef} data-export-target className="rounded-xl border overflow-hidden" style={{ background: "#161618", borderColor: "rgba(255,255,255,0.10)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
        <div className="flex items-center gap-2.5">
          <ArrowRightLeft className="w-4 h-4" style={{ color: "#62616a" }} />
          <span className="font-display font-semibold text-[15px]" style={{ color: "#ededee" }}>Substituições e Tempo em Campo</span>
          <span className="font-editorial-mono text-[10px]" style={{ color: "#62616a" }}>
            {summaryStats.totalSubs} sub · {summaryStats.playersUsedCount} jogadores
          </span>
        </div>
        <button
          onClick={() => exportToPng(cardRef.current)}
          disabled={isExporting}
          className="flex items-center gap-1.5 font-editorial-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors hover:bg-zinc-800/40 disabled:opacity-50"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#ededee" }}
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? "..." : "PNG"}
        </button>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { value: summaryStats.totalSubs,         label: "Substituições" },
            { value: summaryStats.startersCount,     label: "Titulares"     },
            { value: summaryStats.playersUsedCount,  label: "Jogadores"     },
            { value: `${summaryStats.avgMinutes}'`,  label: "Média Min."    },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <span className="font-display font-bold tabular-nums" style={{ fontSize: 30, lineHeight: 1, color: "#ededee" }}>{value}</span>
              <span className="font-editorial-mono text-[10px] uppercase tracking-wider" style={{ color: "#62616a" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Substitutions Timeline */}
        {substitutions.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="font-editorial-mono text-[10px] uppercase tracking-wider flex items-center gap-2" style={{ color: "#62616a" }}>
              <Timer className="h-3.5 w-3.5" />
              Timeline de Substituições
            </h4>
            <div className="space-y-2">
              {substitutions.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <span className="font-editorial-mono text-[11px] font-bold shrink-0 tabular-nums px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", color: "#ededee" }}>
                    {sub.displayMinute}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Player Out */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <ArrowDown className="h-4 w-4 text-red-500 shrink-0" />
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={sub.playerOut.player?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {sub.playerOut.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm truncate">
                        {sub.playerOut.player?.full_name.split(" ").slice(-1)[0]}
                      </span>
                    </div>

                    <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" style={{ color: "#62616a" }} />

                    {/* Player In */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <ArrowUp className="h-4 w-4 text-emerald-500 shrink-0" />
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={sub.playerIn.player?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {sub.playerIn.player?.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-display text-[13px] truncate" style={{ color: "#ededee" }}>
                        {sub.playerIn.player?.full_name.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                  </div>
                  <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md shrink-0" style={{ background: "rgba(255,255,255,0.07)", color: "#62616a" }}>
                    {sub.half === 1 ? "1T" : "2T"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time on Field List */}
        <div className="space-y-2.5">
          <h4 className="font-editorial-mono text-[10px] uppercase tracking-wider flex items-center gap-2" style={{ color: "#62616a" }}>
            <Clock className="h-3.5 w-3.5" />
            Tempo em Campo por Jogador
          </h4>
          <div className="space-y-1.5">
              {playerTimeStats.map((stat) => {
                if (!stat.player.player) return null;
                const percentPlayed = getMinutesPlayedPercent(stat.minutesPlayed);
                return (
                  <div
                    key={stat.player.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={stat.player.player.photo_url || undefined} />
                      <AvatarFallback className="font-display text-xs">
                        {stat.player.player.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-semibold text-[13px] truncate" style={{ color: "#ededee" }}>
                          {stat.player.player.full_name}
                        </span>
                        {stat.started && (
                          <span className="font-editorial-mono text-[9px] px-1.5 py-0.5 rounded border" style={{ color: "#62616a", borderColor: "rgba(255,255,255,0.10)" }}>TIT</span>
                        )}
                        {stat.wasSubstitutedIn  && <ArrowUp   className="h-3 w-3 text-green-500 shrink-0" />}
                        {stat.wasSubstitutedOut && <ArrowDown  className="h-3 w-3 text-red-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percentPlayed, 100)}%`, background: "#ec4525" }} />
                        </div>
                        <span className="font-editorial-mono text-[10px] shrink-0 w-8 text-right" style={{ color: "#62616a" }}>{percentPlayed}%</span>
                      </div>
                      {stat.rangeDisplay !== "—" && (
                        <span className="font-editorial-mono text-[10px] mt-0.5 block" style={{ color: "#62616a" }}>{stat.rangeDisplay}</span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-[13px]" style={{ color: "#ededee" }}>{stat.minutesPlayed} min</p>
                      <p className="font-editorial-mono text-[9px]" style={{ color: "#62616a" }}>(regulamentar)</p>
                      {stat.hasAddedTime && stat.minutesPlayedTotal > stat.minutesPlayed && (
                        <p className="font-editorial-mono text-[9px]" style={{ color: "rgba(98,97,106,0.7)" }}>c/ acrés: {stat.minutesPlayedTotal}</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
