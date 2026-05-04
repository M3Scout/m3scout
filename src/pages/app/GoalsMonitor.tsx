import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Target, 
  Search, 
  Loader2, 
  Trophy,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fetchPlayerMatchStatsRaw } from "@/lib/playerMatchStatsProvider";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PlayerGoalsCard } from "@/components/goals/PlayerGoalsCard";

// Goal type configuration (mirrored from AthleteSeasonGoalsCard)
interface GoalTypeConfig {
  label: string;
  icon: string;
  color: string;
  type: "accumulation" | "limit";
  limitLabel?: string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  goals: { label: "Gols", icon: "⚽", color: "emerald", type: "accumulation" },
  assists: { label: "Assistências", icon: "🅰️", color: "blue", type: "accumulation" },
  matches: { label: "Partidas", icon: "🏟️", color: "violet", type: "accumulation" },
  minutes: { label: "Minutos", icon: "⏱️", color: "amber", type: "accumulation" },
  shots: { label: "Finalizações", icon: "🎯", color: "orange", type: "accumulation" },
  tackles: { label: "Desarmes", icon: "🦵", color: "cyan", type: "accumulation" },
  interceptions: { label: "Interceptações", icon: "🧲", color: "indigo", type: "accumulation" },
  pass_accuracy: { label: "Aproveitamento de Passe", icon: "📊", color: "teal", type: "accumulation" },
  dribble_accuracy: { label: "Aproveitamento de Dribles", icon: "🏃", color: "purple", type: "accumulation" },
  yellow_cards_max: { label: "Amarelos", icon: "🟨", color: "yellow", type: "limit", limitLabel: "máx." },
  saves: { label: "Defesas Totais", icon: "🧤", color: "cyan", type: "accumulation" },
  saves_difficult: { label: "Defesas Difíceis", icon: "🦸", color: "rose", type: "accumulation" },
  clean_sheets: { label: "Clean Sheets", icon: "🛡️", color: "green", type: "accumulation" },
  // New goalkeeper goal types
  goals_conceded_max: { label: "Gols Sofridos", icon: "🥅", color: "red", type: "limit", limitLabel: "máx." },
  goalkeeper_claims_accuracy: { label: "Saídas do Gol Corretas", icon: "🧤", color: "teal", type: "accumulation" },
  penalty_save_rate: { label: "Pênaltis Defendidos", icon: "🥊", color: "purple", type: "accumulation" },
};

type GoalStatus = "in_progress" | "completed" | "exceeded";
type SortOption = "recent" | "oldest" | "progress_high" | "progress_low" | "player_name";

interface GoalWithPlayer {
  id: string;
  goal_type: string;
  target_value: number;
  season_year: number;
  created_at: string;
  player_id: string;
  player: {
    id: string;
    full_name: string;
    position: string;
    age: number | null;
    photo_url: string | null;
  } | null;
}

interface GoalWithProgress extends GoalWithPlayer {
  currentValue: number;
  percentage: number;
  status: GoalStatus;
}

// Calculate status based on goal type and progress
function calculateStatus(goalType: string, currentValue: number, targetValue: number): GoalStatus {
  const config = GOAL_TYPE_CONFIG[goalType];
  const isLimit = config?.type === "limit";
  
  if (isLimit) {
    return currentValue > targetValue ? "exceeded" : "completed";
  }
  return currentValue >= targetValue ? "completed" : "in_progress";
}

// Get progress bar color
function getProgressColor(percentage: number, isLimit: boolean): string {
  if (isLimit) {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-emerald-500";
  }
  if (percentage >= 100) return "bg-emerald-500";
  if (percentage >= 75) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-zinc-500";
}

// Status badge component
function StatusBadge({ status, isLimit }: { status: GoalStatus; isLimit: boolean }) {
  if (status === "completed" && !isLimit) {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Concluída
      </Badge>
    );
  }
  if (status === "exceeded") {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Excedido
      </Badge>
    );
  }
  if (status === "completed" && isLimit) {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Dentro do limite
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/30 text-[10px]">
      <Clock className="w-3 h-3 mr-1" />
      Em andamento
    </Badge>
  );
}

// Group goals by player and render as cards
function GoalsGridView({ 
  goals, 
  onGoalClick 
}: { 
  goals: GoalWithProgress[]; 
  onGoalClick: (goal: GoalWithProgress) => void;
}) {
  // Group goals by player_id
  const groupedByPlayer = useMemo(() => {
    const map = new Map<string, {
      player: GoalWithProgress["player"];
      goals: GoalWithProgress[];
    }>();

    goals.forEach(goal => {
      if (!goal.player) return;
      
      const existing = map.get(goal.player_id);
      if (existing) {
        existing.goals.push(goal);
      } else {
        map.set(goal.player_id, {
          player: goal.player,
          goals: [goal],
        });
      }
    });

    return Array.from(map.values());
  }, [goals]);

  if (groupedByPlayer.length === 0) {
    return (
      <div className="py-20 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
        <p className="text-lg text-muted-foreground">Nenhuma meta encontrada</p>
        <p className="text-sm text-zinc-600 mt-1">Tente ajustar os filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{groupedByPlayer.length} jogadores • {goals.length} metas</span>
      </div>

      {/* Player cards grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {groupedByPlayer.map(({ player, goals: playerGoals }) => {
          if (!player) return null;
          
          return (
            <PlayerGoalsCard
              key={player.id}
              player={{
                id: player.id,
                full_name: player.full_name,
                position: player.position,
                age: player.age,
                photo_url: player.photo_url,
              }}
              goals={playerGoals.map(g => ({
                id: g.id,
                goal_type: g.goal_type,
                target_value: g.target_value,
                season_year: g.season_year,
                currentValue: g.currentValue,
                percentage: g.percentage,
                status: g.status,
              }))}
              onGoalClick={(goal) => {
                // Find the full goal object to pass to modal
                const fullGoal = playerGoals.find(g => g.id === goal.id);
                if (fullGoal) onGoalClick(fullGoal);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function GoalsMonitor() {
  const isDev = import.meta.env.DEV;
  const { isAdmin } = useAuth();
  const { can, loading: permissionsLoading, permissionsError } = usePermissions();

  const [searchQuery, setSearchQuery] = useState("");
  const [goalTypeFilter, setGoalTypeFilter] = useState<string>("_all");
  const [seasonFilter, setSeasonFilter] = useState<string>("_all");
  const [statusFilter, setStatusFilter] = useState<string>("_all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null);
  
  const currentYear = new Date().getFullYear();

  // Fetch all goals with player info
  const { data: goalsRaw, isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ["admin-goals-monitor"],
    queryFn: async () => {
      // Use left join (no !inner) to avoid RLS filtering issues
      const { data, error } = await supabase
        .from("player_season_goals")
        .select(`
          id,
          goal_type,
          target_value,
          season_year,
          created_at,
          player_id,
          player:players(
            id,
            full_name,
            position,
            age,
            photo_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[GoalsMonitor] Query error:", error);
        throw error;
      }
      
      if (isDev) {
        console.log("[GoalsMonitor] Fetched goals:", data?.length ?? 0, data);
      }
      return data as GoalWithPlayer[];
    },
  });


  // Fetch stats for each unique player to calculate progress
  const playerIds = useMemo(() => {
    if (!goalsRaw) return [];
    return [...new Set(goalsRaw.map(g => g.player_id))];
  }, [goalsRaw]);

  // Interface for unified stats combining Live + Manual
  interface UnifiedSeasonStats {
    goals: number;
    assists: number;
    matches: number;
    minutes: number;
    shots: number;
    tackles: number;
    yellow_cards: number;
    saves: number;
    clean_sheets: number;
    interceptions: number;
    passes_completed: number;
    passes_total: number;
    dribbles_success: number;
    dribbles_total: number;
    // Goalkeeper-specific stats
    goals_conceded: number;
    claims_success: number;
    claims_total: number;
    penalties_saved: number;
    penalties_faced: number;
  }

  const { data: playerStats, isLoading: statsLoading, fetchStatus: statsFetchStatus } = useQuery({
    queryKey: ["admin-goals-player-stats-unified", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return {};
      
      const statsMap: Record<string, Record<number, UnifiedSeasonStats>> = {};

      // Fetch stats for each player in parallel
      await Promise.all(playerIds.map(async (playerId) => {
        try {
          // ==== 1. LIVE MATCH STATS ====
          const { matchPlayers, matchStats } = await fetchPlayerMatchStatsRaw({ playerId });
          
          // Group by season
          const liveBySeasonYear: Record<number, typeof matchStats> = {};
          matchPlayers.forEach(mp => {
            if (mp.match?.season_year) {
              if (!liveBySeasonYear[mp.match.season_year]) {
                liveBySeasonYear[mp.match.season_year] = [];
              }
            }
          });
          
          matchStats.forEach(stat => {
            const mp = matchPlayers.find(m => m.match_id === stat.match_id);
            if (mp?.match?.season_year) {
              if (!liveBySeasonYear[mp.match.season_year]) {
                liveBySeasonYear[mp.match.season_year] = [];
              }
              liveBySeasonYear[mp.match.season_year].push(stat);
            }
          });

          // ==== 2. MANUAL STATS (from manual_player_stats table) ====
          const { data: manualRows, error: manualError } = await supabase
            .from("manual_player_stats")
            .select("*")
            .eq("player_id", playerId);
          
          if (manualError) {
            console.warn(`[GoalsMonitor] Failed to fetch manual stats for ${playerId}:`, manualError);
          }

          // ==== 3. LEGACY STATS (from player_stats table - admin-entered data) ====
          // NOTE: player_stats table is used for admin-entered manual data (not manual_player_stats)
          // See memory: .memory/architecture/compare-unified-stats-v1.md
          const { data: legacyRows, error: legacyError } = await supabase
            .from("player_stats")
            .select("*")
            .eq("player_id", playerId)
            .or("is_archived.is.null,is_archived.eq.false"); // Exclude archived
          
          if (legacyError) {
            console.warn(`[GoalsMonitor] Failed to fetch legacy stats for ${playerId}:`, legacyError);
          }
          
          // Group manual_player_stats by season
          const manualBySeasonYear: Record<number, typeof manualRows> = {};
          (manualRows || []).forEach(ms => {
            if (!manualBySeasonYear[ms.season_year]) {
              manualBySeasonYear[ms.season_year] = [];
            }
            manualBySeasonYear[ms.season_year].push(ms);
          });

          // Group player_stats (legacy) by season
          const legacyBySeasonYear: Record<number, typeof legacyRows> = {};
          (legacyRows || []).forEach(ls => {
            if (!legacyBySeasonYear[ls.season_year]) {
              legacyBySeasonYear[ls.season_year] = [];
            }
            legacyBySeasonYear[ls.season_year].push(ls);
          });

          // ==== 4. MERGE: Get all unique season years from all sources ====
          const allSeasons = new Set<number>([
            ...Object.keys(liveBySeasonYear).map(Number),
            ...Object.keys(manualBySeasonYear).map(Number),
            ...Object.keys(legacyBySeasonYear).map(Number),
          ]);

          statsMap[playerId] = {};

          allSeasons.forEach(seasonYear => {
            const liveStats = liveBySeasonYear[seasonYear] || [];
            const manualStats = manualBySeasonYear[seasonYear] || [];
            const legacyStats = legacyBySeasonYear[seasonYear] || [];
            const seasonMatchPlayers = matchPlayers.filter(mp => mp.match?.season_year === seasonYear);

            // LIVE calculations
            const liveShotsOffTarget = liveStats.reduce((sum, s) => sum + (s.shots || 0), 0);
            const liveShotsOnTarget = liveStats.reduce((sum, s) => sum + (s.shots_on_target || 0), 0);
            const liveShotsBlocked = liveStats.reduce((sum, s) => sum + (s.shots_blocked || 0), 0);
            const liveShotsTotal = liveShotsOffTarget + liveShotsOnTarget + liveShotsBlocked;

            const liveGoals = liveStats.reduce((sum, s) => sum + (s.goals || 0), 0);
            const liveAssists = liveStats.reduce((sum, s) => sum + (s.assists || 0), 0);
            const liveMatches = seasonMatchPlayers.length;
            const liveMinutes = seasonMatchPlayers.reduce((sum, mp) => sum + (mp.minutes_played || 0), 0);
            const liveTackles = liveStats.reduce((sum, s) => sum + (s.tackles || 0), 0);
            const liveYellowCards = liveStats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0);
            const liveSaves = liveStats.reduce((sum, s) => sum + (s.saves || 0), 0);
            const liveInterceptions = liveStats.reduce((sum, s) => sum + (s.interceptions || 0), 0);
            const livePassesCompleted = liveStats.reduce((sum, s) => sum + (s.passes_completed || 0), 0);
            const livePassesFailed = liveStats.reduce((sum, s) => sum + (s.passes_total || 0), 0); // DB stores failed in passes_total
            const livePassesTotal = livePassesCompleted + livePassesFailed;
            const liveDribblesSuccess = liveStats.reduce((sum, s) => sum + (s.dribbles_success || 0), 0);
            const liveDribblesFailed = liveStats.reduce((sum, s) => sum + (s.dribbles_total || 0), 0); // DB stores failed in dribbles_total
            const liveDribblesTotal = liveDribblesSuccess + liveDribblesFailed;

            // MANUAL calculations (from manual_player_stats table)
            const manualGoals = manualStats.reduce((sum, s) => sum + (s.goals || 0), 0);
            const manualAssists = manualStats.reduce((sum, s) => sum + (s.assists || 0), 0);
            const manualMatches = manualStats.reduce((sum, s) => sum + (s.games || 0), 0);
            const manualMinutes = manualStats.reduce((sum, s) => sum + (s.minutes || 0), 0);
            const manualShots = manualStats.reduce((sum, s) => sum + (s.shots || 0) + (s.shots_on_target || 0), 0);
            const manualTackles = manualStats.reduce((sum, s) => sum + (s.tackles || 0), 0);
            const manualYellowCards = manualStats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0);
            const manualSaves = manualStats.reduce((sum, s) => sum + (s.saves || 0), 0);
            const manualCleanSheets = manualStats.reduce((sum, s) => sum + (s.clean_sheets || 0), 0);
            const manualInterceptions = manualStats.reduce((sum, s) => sum + (s.interceptions || 0), 0);
            const manualPassesCompleted = manualStats.reduce((sum, s) => sum + (s.passes_completed || 0), 0);
            const manualPassesFailed = manualStats.reduce((sum, s) => sum + (s.passes_failed || 0), 0);
            const manualPassesTotal = manualPassesCompleted + manualPassesFailed;
            const manualDribblesSuccess = manualStats.reduce((sum, s) => sum + (s.dribbles_success || 0), 0);
            const manualDribblesFailed = manualStats.reduce((sum, s) => sum + (s.dribbles_failed || 0), 0);
            const manualDribblesTotal = manualDribblesSuccess + manualDribblesFailed;
            // Goalkeeper-specific (manual)
            const manualGoalsConceded = manualStats.reduce((sum, s) => sum + (s.goals_conceded || 0), 0);
            const manualPenaltiesSaved = manualStats.reduce((sum, s) => sum + (s.penalties_saved || 0), 0);

            // LEGACY calculations (from player_stats table - admin-entered data)
            // In player_stats (legacy), `shots` is already the TOTAL shots count
            // shots_on_target is just a breakdown (subset of shots), NOT additive
            const legacyShotsTotal = legacyStats.reduce((sum, s) => sum + (s.shots || 0), 0);
            const legacyGoals = legacyStats.reduce((sum, s) => sum + (s.goals || 0), 0);
            const legacyAssists = legacyStats.reduce((sum, s) => sum + (s.assists || 0), 0);
            const legacyMatches = legacyStats.reduce((sum, s) => sum + (s.matches || 0), 0);
            const legacyMinutes = legacyStats.reduce((sum, s) => sum + (s.minutes || 0), 0);
            const legacyTackles = legacyStats.reduce((sum, s) => sum + (s.tackles || 0), 0);
            const legacyYellowCards = legacyStats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0);
            const legacySaves = legacyStats.reduce((sum, s) => sum + (s.saves || 0), 0);
            const legacyCleanSheets = legacyStats.reduce((sum, s) => sum + (s.clean_sheets || 0), 0);
            const legacyInterceptions = legacyStats.reduce((sum, s) => sum + (s.interceptions || 0), 0);
            // Legacy uses accurate_passes (completed) and total_passes
            const legacyPassesCompleted = legacyStats.reduce((sum, s) => sum + (s.accurate_passes || 0), 0);
            const legacyPassesTotal = legacyStats.reduce((sum, s) => sum + (s.total_passes || 0), 0);
            // Legacy uses successful_dribbles and total_dribbles
            const legacyDribblesSuccess = legacyStats.reduce((sum, s) => sum + (s.successful_dribbles || 0), 0);
            const legacyDribblesTotal = legacyStats.reduce((sum, s) => sum + (s.total_dribbles || 0), 0);
            // Goalkeeper-specific (legacy)
            const legacyGoalsConceded = legacyStats.reduce((sum, s) => sum + (s.goals_conceded || 0), 0);
            const legacyPenaltiesSaved = legacyStats.reduce((sum, s) => sum + (s.penalties_saved || 0), 0);
            const legacyPenaltiesFaced = legacyStats.reduce((sum, s) => sum + (s.penalty_faced || 0), 0);
            // Note: claims (gk exits) from legacy - claims = successful exits
            const legacyClaims = legacyStats.reduce((sum, s) => sum + (s.claims || 0), 0);

            // LIVE calculations for goalkeeper-specific
            const liveGoalsConceded = liveStats.reduce((sum, s) => sum + (s.goals_conceded || 0), 0);
            // Note: Live match doesn't have penalties_saved/faced or claims tracked separately yet
            // We'll rely on manual/legacy data for these

            // ==== UNIFIED: Live + Manual + Legacy SUM ====
            statsMap[playerId][seasonYear] = {
              goals: liveGoals + manualGoals + legacyGoals,
              assists: liveAssists + manualAssists + legacyAssists,
              matches: liveMatches + manualMatches + legacyMatches,
              minutes: liveMinutes + manualMinutes + legacyMinutes,
              shots: liveShotsTotal + manualShots + legacyShotsTotal,
              tackles: liveTackles + manualTackles + legacyTackles,
              yellow_cards: liveYellowCards + manualYellowCards + legacyYellowCards,
              saves: liveSaves + manualSaves + legacySaves,
              clean_sheets: manualCleanSheets + legacyCleanSheets,
              interceptions: liveInterceptions + manualInterceptions + legacyInterceptions,
              passes_completed: livePassesCompleted + manualPassesCompleted + legacyPassesCompleted,
              passes_total: livePassesTotal + manualPassesTotal + legacyPassesTotal,
              dribbles_success: liveDribblesSuccess + manualDribblesSuccess + legacyDribblesSuccess,
              dribbles_total: liveDribblesTotal + manualDribblesTotal + legacyDribblesTotal,
              // Goalkeeper-specific stats
              goals_conceded: liveGoalsConceded + manualGoalsConceded + legacyGoalsConceded,
              claims_success: legacyClaims, // Only legacy has claims tracked
              claims_total: legacyClaims, // Assuming all claims are successful attempts for now
              penalties_saved: manualPenaltiesSaved + legacyPenaltiesSaved,
              penalties_faced: legacyPenaltiesFaced, // Only legacy has penalty_faced
            };

            if (isDev) {
              console.log(`[GoalsMonitor] Unified stats for ${playerId} / ${seasonYear}:`, {
                live: { goals: liveGoals, assists: liveAssists, matches: liveMatches, shots: liveShotsTotal, interceptions: liveInterceptions },
                manual: { goals: manualGoals, assists: manualAssists, matches: manualMatches, shots: manualShots },
                legacy: { goals: legacyGoals, assists: legacyAssists, matches: legacyMatches, shots: legacyShotsTotal, interceptions: legacyInterceptions },
                unified: statsMap[playerId][seasonYear],
              });
            }
          });
        } catch (err) {
          console.error(`Error fetching stats for player ${playerId}:`, err);
        }
      }));

      return statsMap;
    },
    enabled: playerIds.length > 0,
  });

  // Combine goals with progress data
  const goalsWithProgress: GoalWithProgress[] = useMemo(() => {
    if (!goalsRaw) return [];
    
    return goalsRaw.map(goal => {
      const playerSeasonStats = playerStats?.[goal.player_id]?.[goal.season_year];
      
      let currentValue = 0;
      if (playerSeasonStats) {
        switch (goal.goal_type) {
          case "goals": currentValue = playerSeasonStats.goals; break;
          case "assists": currentValue = playerSeasonStats.assists; break;
          case "matches": currentValue = playerSeasonStats.matches; break;
          case "minutes": currentValue = playerSeasonStats.minutes; break;
          case "shots": currentValue = playerSeasonStats.shots; break;
          case "tackles": currentValue = playerSeasonStats.tackles; break;
          case "yellow_cards_max": currentValue = playerSeasonStats.yellow_cards; break;
          case "saves": currentValue = playerSeasonStats.saves; break;
          case "clean_sheets": currentValue = playerSeasonStats.clean_sheets; break;
          case "interceptions": currentValue = playerSeasonStats.interceptions; break;
          case "pass_accuracy": {
            const completed = playerSeasonStats.passes_completed ?? 0;
            const total = playerSeasonStats.passes_total ?? 0;
            if (total === 0) {
              currentValue = 0;
            } else {
              // Return percentage with 1 decimal
              currentValue = Math.round((completed / total) * 1000) / 10;
            }
            break;
          }
          case "dribble_accuracy": {
            const success = playerSeasonStats.dribbles_success ?? 0;
            const total = playerSeasonStats.dribbles_total ?? 0;
            if (total === 0) {
              currentValue = 0;
            } else {
              // Return percentage with 1 decimal
              currentValue = Math.round((success / total) * 1000) / 10;
            }
            break;
          }
          case "saves_difficult": currentValue = 0; break; // Not tracked yet
          // New goalkeeper goal types
          case "goals_conceded_max": {
            currentValue = playerSeasonStats.goals_conceded ?? 0;
            break;
          }
          case "goalkeeper_claims_accuracy": {
            const success = playerSeasonStats.claims_success ?? 0;
            const total = playerSeasonStats.claims_total ?? 0;
            if (total === 0) {
              currentValue = 0;
            } else {
              // Return percentage with 1 decimal
              currentValue = Math.round((success / total) * 1000) / 10;
            }
            break;
          }
          case "penalty_save_rate": {
            const saved = playerSeasonStats.penalties_saved ?? 0;
            const faced = playerSeasonStats.penalties_faced ?? 0;
            if (faced === 0) {
              currentValue = 0;
            } else {
              // Return percentage with 1 decimal
              currentValue = Math.round((saved / faced) * 1000) / 10;
            }
            break;
          }
        }
      }

      const percentage = goal.target_value > 0 
        ? Math.min((currentValue / goal.target_value) * 100, 100)
        : 0;
      const status = calculateStatus(goal.goal_type, currentValue, goal.target_value);

      return {
        ...goal,
        currentValue,
        percentage,
        status,
      };
    });
  }, [goalsRaw, playerStats]);

  // Get unique seasons for filter
  const availableSeasons = useMemo(() => {
    if (!goalsRaw) return [];
    return [...new Set(goalsRaw.map(g => g.season_year))].sort((a, b) => b - a);
  }, [goalsRaw]);

  // Filter and sort goals
  const filteredGoals = useMemo(() => {
    let filtered = goalsWithProgress;

    // Search by player name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        g.player?.full_name.toLowerCase().includes(query)
      );
    }

    // Filter by goal type
    if (goalTypeFilter && goalTypeFilter !== "_all") {
      filtered = filtered.filter(g => g.goal_type === goalTypeFilter);
    }

    // Filter by season
    if (seasonFilter && seasonFilter !== "_all") {
      filtered = filtered.filter(g => g.season_year === Number(seasonFilter));
    }

    // Filter by status
    if (statusFilter && statusFilter !== "_all") {
      filtered = filtered.filter(g => g.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "progress_high":
        filtered.sort((a, b) => b.percentage - a.percentage);
        break;
      case "progress_low":
        filtered.sort((a, b) => a.percentage - b.percentage);
        break;
      case "player_name":
        filtered.sort((a, b) => (a.player?.full_name || "").localeCompare(b.player?.full_name || ""));
        break;
    }

    return filtered;
  }, [goalsWithProgress, searchQuery, goalTypeFilter, seasonFilter, statusFilter, sortBy]);

  // Stats summary
  const stats = useMemo(() => {
    const total = goalsWithProgress.length;
    const completed = goalsWithProgress.filter(g => g.status === "completed").length;
    const inProgress = goalsWithProgress.filter(g => g.status === "in_progress").length;
    const exceeded = goalsWithProgress.filter(g => g.status === "exceeded").length;
    return { total, completed, inProgress, exceeded };
  }, [goalsWithProgress]);

  // Fix: statsLoading stays true when query is disabled (enabled: false)
  // Check fetchStatus to know if the query is actually fetching
  const isStatsActuallyLoading = statsLoading && statsFetchStatus === "fetching";
  const isLoading = goalsLoading || (playerIds.length > 0 && isStatsActuallyLoading);

  const goals = goalsRaw ?? [];
  const rbacAllowed = isAdmin || can("users", "manage");

  // Debug log (dev only)
  if (isDev) {
    console.log("[GoalsMonitor] Render:", {
      permissionsLoading,
      permissionsError,
      rbacAllowed,
      goalsLoading,
      goalsError: goalsError ? String(goalsError) : null,
      statsLoading,
      statsFetchStatus,
      playerIdsLength: playerIds.length,
      isLoading,
      goalsLength: goals.length,
      firstGoal: goals[0] ?? null,
      filteredGoalsLength: filteredGoals.length,
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ===== ALWAYS VISIBLE HEADER (even during RBAC/loading) ===== */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m3-page-title">MONITORAR</h1>
            {isDev && (
              <pre className="mt-3 max-w-full overflow-auto rounded-lg border border-border/50 bg-card/50 p-3 text-[11px] leading-snug text-muted-foreground">
{JSON.stringify(goals?.[0] ?? null, null, 2)}
              </pre>
            )}
          </div>

          {/* Small non-blocking RBAC indicator */}
          {permissionsLoading && (
            <div className="text-xs text-muted-foreground">Sincronizando permissões…</div>
          )}
        </header>

        {/* ===== RBAC DENY (never blank) ===== */}
        {!permissionsLoading && !permissionsError && !rbacAllowed ? (
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm font-medium">Sem permissão</p>
            <p className="text-xs text-muted-foreground">Você não tem acesso ao monitor de metas.</p>
          </div>
        ) : (
          /* ===== MAIN CONTENT ===== */
          /* Keep existing UI below (filters/table/cards). */
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="m3-section-title"><span style={{ color: "#E5173F" }}>// </span>METAS</h2>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="text-sm font-medium text-foreground">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">{stats.completed}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-500/10">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-400">{stats.inProgress}</span>
            </div>
            {stats.exceeded > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-sm font-medium text-red-400">{stats.exceeded}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900/60 border-zinc-800/40">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por jogador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700/50"
                />
              </div>

              {/* Goal Type Filter */}
              <Select value={goalTypeFilter} onValueChange={setGoalTypeFilter}>
                <SelectTrigger className="w-full md:w-[160px] bg-zinc-800/50 border-zinc-700/50">
                  <SelectValue placeholder="Tipo de meta" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="_all">Todas as metas</SelectItem>
                  {Object.entries(GOAL_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Season Filter */}
              <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                <SelectTrigger className="w-full md:w-[140px] bg-zinc-800/50 border-zinc-700/50">
                  <SelectValue placeholder="Temporada" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="_all">Todas</SelectItem>
                  {availableSeasons.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px] bg-zinc-800/50 border-zinc-700/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="_all">Todos status</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="exceeded">Excedido</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full md:w-[160px] bg-zinc-800/50 border-zinc-700/50">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigas</SelectItem>
                  <SelectItem value="progress_high">Maior progresso</SelectItem>
                  <SelectItem value="progress_low">Menor progresso</SelectItem>
                  <SelectItem value="player_name">Por jogador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        ) : goalsError ? (
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm font-medium">Erro ao carregar metas</p>
            <p className="mt-1 text-xs text-muted-foreground">{String(goalsError)}</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-20 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-lg text-muted-foreground">Nenhuma meta criada ainda</p>
            <p className="text-sm text-zinc-600 mt-1">
              {searchQuery || goalTypeFilter !== "_all" || statusFilter !== "_all"
                ? "Tente ajustar os filtros"
                : "Os jogadores podem criar metas no dashboard deles"}
            </p>
          </div>
        ) : (
          <GoalsGridView 
            goals={filteredGoals} 
            onGoalClick={setSelectedGoal} 
          />
        )}
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-emerald-400" />
              Detalhes da Meta
            </DialogTitle>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-6 pt-2">
              {/* Player Info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
                {selectedGoal.player?.photo_url ? (
                  <img 
                    src={selectedGoal.player.photo_url} 
                    alt={selectedGoal.player.full_name}
                    className="w-14 h-14 rounded-full object-cover" width={56} height={56}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="w-7 h-7 text-zinc-500" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedGoal.player?.full_name || "Jogador"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedGoal.player?.position}
                    {selectedGoal.player?.age && ` • ${selectedGoal.player.age} anos`}
                  </p>
                </div>
              </div>

              {/* Goal Details */}
              {(() => {
                const config = GOAL_TYPE_CONFIG[selectedGoal.goal_type] || {
                  label: selectedGoal.goal_type,
                  icon: "🎯",
                  type: "accumulation" as const,
                };
                const isLimit = config.type === "limit";

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          {isLimit && (
                            <p className="text-[10px] text-zinc-500">Tipo: Limite máximo</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={selectedGoal.status} isLimit={isLimit} />
                    </div>

                    {/* Progress */}
                    <div className="p-4 rounded-xl bg-zinc-800/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Progresso</span>
                        <span className="text-lg font-bold text-foreground">
                          {Math.round(selectedGoal.percentage)}%
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            getProgressColor(selectedGoal.percentage, isLimit)
                          )}
                          style={{ width: `${selectedGoal.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Atual</span>
                        <span className="font-medium text-foreground">{selectedGoal.currentValue}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Alvo</span>
                        <span className="font-medium text-foreground">{selectedGoal.target_value}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-zinc-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Temporada</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{selectedGoal.season_year}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Criada em</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(selectedGoal.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {/* Stats Used Info */}
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
                      <p className="text-xs text-muted-foreground mb-2">
                        <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                        Estatísticas utilizadas no cálculo:
                      </p>
                      <p className="text-sm text-foreground">
                        {isLimit 
                          ? `O jogador acumulou ${selectedGoal.currentValue} ${config.label.toLowerCase()} (limite: ${selectedGoal.target_value})`
                          : `${selectedGoal.currentValue} de ${selectedGoal.target_value} ${config.label.toLowerCase()} alcançados`
                        }
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Close Button */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setSelectedGoal(null)}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
