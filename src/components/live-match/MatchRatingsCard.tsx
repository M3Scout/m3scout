/**
 * Card that displays all player ratings for a match.
 * Shows players sorted by rating (highest first).
 * 
 * Uses the matchRatingEngine and displays the SofaScore-style ratings.
 * Now includes Match Profile (Perfil do Jogo) - qualitative performance interpretation.
 * Also includes Match Efficiency (Eficiência no Jogo) - quality vs risk indicator.
 * Includes professional scouting text (position-adapted) combining profile + efficiency.
 */

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlayerRatingBadge } from "./PlayerRatingBadge";
import { MatchProfileText } from "./MatchProfileBadge";
import { MatchEfficiencyBadge } from "./MatchEfficiencyBadge";
import { useSortedPlayersByRating, type MatchPlayer } from "@/hooks/useMatchRatings";
import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import { matchPlayerStatsToInput } from "@/lib/matchRatingEngine";
import { classifyMatchProfile } from "@/lib/matchProfileEngine";
import { calculateMatchEfficiency } from "@/lib/matchEfficiencyEngine";
import { generateScoutingText } from "@/lib/scoutingTextEngine";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchRatingsCardProps {
  matchPlayers: MatchPlayer[];
  playerStatsMap: Record<string, MatchPlayerStats>;
  matchStatus: "draft" | "live" | "finished" | "applied";
}

export function MatchRatingsCard({
  matchPlayers,
  playerStatsMap,
  matchStatus,
}: MatchRatingsCardProps) {
  const sortedPlayers = useSortedPlayersByRating(matchPlayers, playerStatsMap);
  
  // Only show ratings after match is finished or applied
  const showRatings = matchStatus === "finished" || matchStatus === "applied";
  
  // Filter players with valid ratings (played > 0 minutes)
  const playersWithRatings = useMemo(() => 
    sortedPlayers.filter(p => p.rating.hasRating),
    [sortedPlayers]
  );
  
  // Calculate team average (only from players who actually played)
  const teamAverage = useMemo(() => {
    if (playersWithRatings.length === 0) return 0;
    const sum = playersWithRatings.reduce((acc, p) => acc + (p.rating.rating ?? 0), 0);
    return Math.round((sum / playersWithRatings.length) * 10) / 10;
  }, [playersWithRatings]);
  
  // Best and worst ratings (only from players who played)
  const bestPlayer = playersWithRatings[0];
  const worstPlayer = playersWithRatings[playersWithRatings.length - 1];
  
  if (!showRatings) {
    return null;
  }
  
  const CARD_BG      = "#16181a";
  const CARD_BORDER  = "rgba(63,63,70,0.30)";
  const ROW_BG       = "#0d0e0f";
  const ROW_BORDER   = "rgba(39,39,42,0.40)";
  const TEXT         = "#ededee";
  const MUTED        = "#62616a";

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: ROW_BORDER }}>
        <div className="flex items-center gap-2.5">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span className="font-display font-semibold text-[15px]" style={{ color: TEXT }}>Notas da Partida</span>
        </div>
        {playersWithRatings.length > 0 && (
          <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: MUTED }}>
            Média {teamAverage.toFixed(1)} · {playersWithRatings.length} jogador{playersWithRatings.length !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Highlights — only when 2+ players */}
        {playersWithRatings.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-1">
            {bestPlayer && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(45,206,138,0.09)", border: "1px solid rgba(45,206,138,0.22)" }}>
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color: "#2DCE8A" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: "#2DCE8A" }}>Destaque</p>
                  <p className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>{bestPlayer.playerName.split(" ")[0]}</p>
                </div>
                <PlayerRatingBadge rating={bestPlayer.rating} playerName={bestPlayer.playerName} size="sm" showTooltip={false} showDetailButton={false} />
              </div>
            )}
            {worstPlayer && worstPlayer.rating.rating !== null && worstPlayer.rating.rating < 6.0 && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(249,115,22,0.09)", border: "1px solid rgba(249,115,22,0.22)" }}>
                <TrendingDown className="h-4 w-4 shrink-0" style={{ color: "#f97316" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: "#f97316" }}>A Evoluir</p>
                  <p className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>{worstPlayer.playerName.split(" ")[0]}</p>
                </div>
                <PlayerRatingBadge rating={worstPlayer.rating} playerName={worstPlayer.playerName} size="sm" showTooltip={false} showDetailButton={false} />
              </div>
            )}
            {worstPlayer && worstPlayer.rating.rating !== null && worstPlayer.rating.rating >= 6.0 && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: ROW_BG, border: `1px solid ${ROW_BORDER}` }}>
                <Minus className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
                <div className="flex-1 min-w-0">
                  <p className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>Consistente</p>
                  <p className="font-display font-semibold text-[13px]" style={{ color: TEXT }}>Todos ≥ 6.0</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Player list — natural height, no ScrollArea */}
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.playerId}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 hover:brightness-105"
              style={{
                background: index === 0 ? "rgba(45,206,138,0.07)" : ROW_BG,
                border: `1px solid ${index === 0 ? "rgba(45,206,138,0.20)" : ROW_BORDER}`,
              }}
            >
              {/* Rank badge */}
              <div
                className="w-6 h-6 flex items-center justify-center rounded-full font-editorial-mono text-[10px] font-bold shrink-0"
                style={{
                  background: index === 0 ? "#f59e0b" : index === 1 ? "#71717a" : index === 2 ? "#92400e" : "rgba(255,255,255,0.07)",
                  color: index <= 2 ? (index === 0 ? "#000" : "#fff") : MUTED,
                }}
              >
                {index + 1}
              </div>

              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={player.photoUrl || undefined} />
                <AvatarFallback className="font-display text-[10px]">{player.playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>{player.playerName}</p>
                <div className="flex items-center gap-1.5 font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                  <span>{player.position}</span>
                  <span>·</span>
                  <span>{player.minutesInfo.durationDisplay}</span>
                </div>
                {player.rating.hasRating && (() => {
                  const statsInput = matchPlayerStatsToInput(playerStatsMap[player.playerId]);
                  const profile    = classifyMatchProfile(statsInput, player.minutesInfo.minutesPlayed);
                  const efficiency = calculateMatchEfficiency(statsInput, player.minutesInfo.minutesPlayed);
                  const isInsufficient = player.minutesInfo.minutesPlayed < 10;
                  const scoutingText = generateScoutingText(player.position, profile.primary.key, efficiency.level, isInsufficient);
                  return (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <MatchProfileText profile={profile} showIcon={false} className="text-[9px]" />
                        <MatchEfficiencyBadge efficiency={efficiency} playerName={player.playerName} size="sm" showIcon />
                      </div>
                      <p className="font-editorial-mono text-[9px] leading-tight line-clamp-2" style={{ color: MUTED }}>
                        {scoutingText.combinedText}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <PlayerRatingBadge rating={player.rating} playerName={player.playerName} size="md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
