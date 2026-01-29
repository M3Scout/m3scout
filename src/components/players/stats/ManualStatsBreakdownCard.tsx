/**
 * Manual Stats Breakdown Card
 * 
 * Shows the breakdown of Live vs Manual stats with clear visual distinction.
 * Displays: Live (from match events) + Manual (external games) = Combined Total
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, FileEdit, Layers, TrendingUp, Clock, Target, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreakdownProps {
  // Live stats (from match_player_stats)
  liveGames: number;
  liveMinutes: number;
  liveGoals: number;
  liveAssists: number;
  
  // Manual stats (from manual_player_stats)
  manualGames: number;
  manualMinutes: number;
  manualGoals: number;
  manualAssists: number;
  
  // Optional: competition name
  competitionName?: string;
  seasonYear?: number;
}

export function ManualStatsBreakdownCard({
  liveGames,
  liveMinutes,
  liveGoals,
  liveAssists,
  manualGames,
  manualMinutes,
  manualGoals,
  manualAssists,
  competitionName,
  seasonYear,
}: BreakdownProps) {
  // Combined totals
  const totalGames = liveGames + manualGames;
  const totalMinutes = liveMinutes + manualMinutes;
  const totalGoals = liveGoals + manualGoals;
  const totalAssists = liveAssists + manualAssists;

  const hasManual = manualGames > 0 || manualMinutes > 0;
  const hasLive = liveGames > 0;

  // Don't render if no data at all
  if (!hasLive && !hasManual) {
    return null;
  }

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/80 to-zinc-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Breakdown de Estatísticas
            </span>
          </div>
          {competitionName && (
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
              {competitionName} {seasonYear}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Live Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-zinc-300">Live Match</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <StatPill icon={Target} value={liveGames} label="jogos" color="emerald" />
            <StatPill icon={Clock} value={liveMinutes} label="min" color="emerald" />
            <StatPill icon={TrendingUp} value={liveGoals} label="gols" color="emerald" />
            <StatPill icon={Shield} value={liveAssists} label="ass" color="emerald" />
          </div>
        </div>

        {/* Manual Stats Row */}
        {hasManual && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center">
                  <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-zinc-300">Jogos Externos</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <StatPill icon={Target} value={manualGames} label="jogos" color="amber" />
                <StatPill icon={Clock} value={manualMinutes} label="min" color="amber" />
                <StatPill icon={TrendingUp} value={manualGoals} label="gols" color="amber" />
                <StatPill icon={Shield} value={manualAssists} label="ass" color="amber" />
              </div>
            </div>

            <Separator className="bg-zinc-800/50" />

            {/* Combined Total Row */}
            <div className="flex items-center justify-between bg-violet-500/5 -mx-4 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <span className="text-xs font-semibold text-violet-300">Total Combinado</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <StatPill icon={Target} value={totalGames} label="jogos" color="violet" bold />
                <StatPill icon={Clock} value={totalMinutes} label="min" color="violet" bold />
                <StatPill icon={TrendingUp} value={totalGoals} label="gols" color="violet" bold />
                <StatPill icon={Shield} value={totalAssists} label="ass" color="violet" bold />
              </div>
            </div>
          </>
        )}

        {/* No manual data message */}
        {!hasManual && hasLive && (
          <p className="text-[10px] text-zinc-600 text-center py-1">
            Nenhum jogo externo registrado. Use "Adicionar Manual" para jogos fora do Live Match.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for stat pills
function StatPill({
  icon: Icon,
  value,
  label,
  color,
  bold = false,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: "emerald" | "amber" | "violet";
  bold?: boolean;
}) {
  const colorClasses = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    violet: "text-violet-400",
  };

  return (
    <div className="flex items-center gap-1">
      <Icon className={cn("w-3 h-3", colorClasses[color])} />
      <span className={cn("text-zinc-300", bold && "font-semibold")}>{value}</span>
      <span className="text-zinc-600">{label}</span>
    </div>
  );
}
