import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Search,
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getMergedSeasonTotals } from "@/lib/recalculatePlayerScores";
import { useAuth } from "@/hooks/authContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PlayerGoalsCard } from "@/components/goals/PlayerGoalsCard";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

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
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  const groupedByPlayer = useMemo(() => {
    const map = new Map<string, { player: GoalWithProgress["player"]; goals: GoalWithProgress[] }>();
    goals.forEach(goal => {
      if (!goal.player) return;
      const existing = map.get(goal.player_id);
      if (existing) existing.goals.push(goal);
      else map.set(goal.player_id, { player: goal.player, goals: [goal] });
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
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{groupedByPlayer.length} jogadores • {goals.length} metas</span>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-start">
        {groupedByPlayer.map(({ player, goals: playerGoals }) => {
          if (!player) return null;
          return (
            <PlayerGoalsCard
              key={player.id}
              expanded={openPlayerId === player.id}
              onToggle={() => setOpenPlayerId(prev => prev === player.id ? null : player.id)}
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
              onGoalClick={goal => {
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

export default function GoalsMonitor({ playerIdFilter }: { playerIdFilter?: string } = {}) {
  const isDev = import.meta.env.DEV;
  const { isAdmin } = useAuth();
  const { can, loading: permissionsLoading, permissionsError } = usePermissions();
  const queryClient = useQueryClient();
  const isPlayerView = !!playerIdFilter;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [goalTypeFilter, setGoalTypeFilter] = useState<string>("_all");
  const [seasonFilter, setSeasonFilter] = useState<string>("_all");
  const [statusFilter, setStatusFilter] = useState<string>("_all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null);
  const [addGoalOpen, setAddGoalOpen] = useState(false);

  const { data: playerProfile } = useQuery({
    queryKey: ["player-position", playerIdFilter],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("position").eq("id", playerIdFilter!).single();
      return data;
    },
    enabled: !!playerIdFilter,
    staleTime: 10 * 60 * 1000,
  });

  const isGoalkeeper = useMemo(() => {
    const pos = (playerProfile?.position ?? "").toLowerCase();
    return pos.includes("goleiro") || pos === "gk" || pos.includes("goalkeeper");
  }, [playerProfile]);
  
  const currentYear = new Date().getFullYear();

  // Fetch all goals with player info
  const { data: goalsRaw, isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ["admin-metas", playerIdFilter],
    queryFn: async () => {
      // Use left join (no !inner) to avoid RLS filtering issues
      let query = supabase
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

      if (playerIdFilter) query = query.eq("player_id", playerIdFilter);

      const { data, error } = await query;

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


  // Unique (playerId, seasonYear) pairs from all goals — to call getMergedSeasonTotals once per pair
  const playerPairs = useMemo(() => {
    if (!goalsRaw) return [];
    const seen = new Set<string>();
    const pairs: { playerId: string; seasonYear: number }[] = [];
    for (const g of goalsRaw) {
      const key = `${g.player_id}:${g.season_year}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ playerId: g.player_id, seasonYear: g.season_year });
      }
    }
    return pairs;
  }, [goalsRaw]);

  // Stats fetched via the same pipeline as the player radar / Detalhes por Temporada
  const { data: playerStats, isLoading: statsLoading, fetchStatus: statsFetchStatus } = useQuery({
    queryKey: ["admin-goals-player-stats-v2", playerPairs],
    queryFn: async () => {
      if (playerPairs.length === 0) return {};
      const statsMap: Record<string, Record<number, import("@/hooks/usePlayerMatchStats").MatchDerivedStats>> = {};
      await Promise.all(playerPairs.map(async ({ playerId, seasonYear }) => {
        try {
          const stats = await getMergedSeasonTotals(playerId, seasonYear);
          if (!statsMap[playerId]) statsMap[playerId] = {};
          statsMap[playerId][seasonYear] = stats;
        } catch (err) {
          console.error(`[GoalsMonitor] Failed to fetch stats for ${playerId}/${seasonYear}:`, err);
        }
      }));
      return statsMap;
    },
    enabled: playerPairs.length > 0,
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
          case "yellow_cards_max": currentValue = playerSeasonStats.yellow_cards ?? 0; break;
          case "saves": currentValue = playerSeasonStats.saves; break;
          case "clean_sheets": currentValue = playerSeasonStats.clean_sheets; break;
          case "interceptions": currentValue = playerSeasonStats.interceptions; break;
          case "clearances": currentValue = playerSeasonStats.clearances ?? 0; break;
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
            // Claims not tracked in the standard pipeline — not available
            currentValue = 0;
            break;
          }
          case "penalty_save_rate": {
            // penalties_faced not in MatchDerivedStats — use penalties_saved as absolute count
            currentValue = playerSeasonStats.penalties_saved ?? 0;
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
  const isLoading = goalsLoading || (playerPairs.length > 0 && isStatsActuallyLoading);

  const goals = goalsRaw ?? [];
  const rbacAllowed = isPlayerView || isAdmin || can("users", "manage");

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
      playerPairsLength: playerPairs.length,
      isLoading,
      goalsLength: goals.length,
      firstGoal: goals[0] ?? null,
      filteredGoalsLength: filteredGoals.length,
    });
  }

  // ── Design tokens (local) ──────────────────────────────────────────────────
  const DT = { accent: "#ec4525", fg: "#ededee", muted: "#62616a", bdr: "rgba(255,255,255,0.07)", bg2: "#0f0e13" };

  return (
    <>
      <div className="space-y-5">
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="m3-page-title">Metas</h1>
            {stats.total > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full font-mono text-[10px] font-bold text-white" style={{ background: DT.accent }}>
                {stats.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPlayerView && (
              <button
                onClick={() => setAddGoalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[11px] tracking-[0.1em] uppercase text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: DT.accent }}
              >
                <span className="text-base leading-none">+</span>
                <span className="hidden sm:inline">Meta</span>
              </button>
            )}
            {!isPlayerView && (
              <button
                className="sm:hidden p-1 transition-colors" style={{ color: DT.muted }}
                onClick={() => setSearchOpen(v => !v)} aria-label="Buscar"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}
            {permissionsLoading && (
              <span className="hidden sm:block font-mono text-[10px]" style={{ color: DT.muted }}>Sincronizando…</span>
            )}
          </div>
        </header>

        {/* Mobile search */}
        {searchOpen && (
          <div className="sm:hidden">
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por jogador..."
              className="w-full rounded-xl px-4 py-2.5 text-[13px] font-mono outline-none"
              style={{ background: DT.bg2, border: `1px solid ${DT.bdr}`, color: DT.fg }}
            />
          </div>
        )}

        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        {!isLoading && stats.total > 0 && (
          <div className="hidden sm:grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total,      color: DT.muted,   icon: Trophy },
              { label: "Concluídas", value: stats.completed, color: "#22c55e", icon: CheckCircle2 },
              { label: "Em andamento", value: stats.inProgress, color: DT.muted, icon: Clock },
              { label: "Excedidas",  value: stats.exceeded,  color: "#ef4444", icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-xl p-4 flex items-center gap-3 group"
                style={{ background: DT.bg2, border: `1px solid ${DT.bdr}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display font-bold text-[22px] leading-none" style={{ color: DT.fg }}>{value}</p>
                  <p className="font-mono text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: DT.muted }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FILTER BAR (oculto na view do atleta) ──────────────────────── */}
        {!isPlayerView && !permissionsLoading && !permissionsError && rbacAllowed && (
          <div className="hidden sm:flex items-center gap-2 p-3 rounded-2xl" style={{ background: DT.bg2, border: `1px solid ${DT.bdr}` }}>
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: DT.muted }} />
              <Input
                placeholder="Buscar por jogador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-[13px] font-mono bg-white/[0.03] border-white/[0.06] placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#ec4525]/40"
              />
            </div>

            <div className="h-6 w-px" style={{ background: DT.bdr }} />

            {/* Goal Type */}
            <Select value={goalTypeFilter} onValueChange={setGoalTypeFilter}>
              <SelectTrigger className="w-[155px] h-9 text-[11px] font-mono bg-white/[0.03] border-white/[0.06]">
                <SelectValue placeholder="Tipo de meta" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0e13] border-white/[0.07]">
                <SelectItem value="_all" className="font-mono text-[12px]">Todas as metas</SelectItem>
                {Object.entries(GOAL_TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="font-mono text-[12px]">{cfg.icon} {cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Season */}
            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
              <SelectTrigger className="w-[120px] h-9 text-[11px] font-mono bg-white/[0.03] border-white/[0.06]">
                <SelectValue placeholder="Temporada" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0e13] border-white/[0.07]">
                <SelectItem value="_all" className="font-mono text-[12px]">Todas</SelectItem>
                {availableSeasons.map(y => (
                  <SelectItem key={y} value={String(y)} className="font-mono text-[12px]">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status quick-pills */}
            <div className="flex items-center gap-1.5">
              {[
                { val: "_all",       label: "Todos" },
                { val: "in_progress", label: "Andamento" },
                { val: "completed",   label: "Concluído" },
                { val: "exceeded",    label: "Excedido" },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className="h-9 px-3 rounded-lg font-mono text-[10px] uppercase tracking-wide transition-all duration-150"
                  style={{
                    background: statusFilter === val ? `${DT.accent}18` : "rgba(255,255,255,0.025)",
                    border: `1px solid ${statusFilter === val ? `${DT.accent}50` : DT.bdr}`,
                    color: statusFilter === val ? DT.accent : DT.muted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px" style={{ background: DT.bdr }} />

            {/* Sort */}
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[145px] h-9 text-[11px] font-mono bg-white/[0.03] border-white/[0.06]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0e13] border-white/[0.07]">
                <SelectItem value="recent"        className="font-mono text-[12px]">Mais recentes</SelectItem>
                <SelectItem value="oldest"        className="font-mono text-[12px]">Mais antigas</SelectItem>
                <SelectItem value="progress_high" className="font-mono text-[12px]">Maior progresso</SelectItem>
                <SelectItem value="progress_low"  className="font-mono text-[12px]">Menor progresso</SelectItem>
                <SelectItem value="player_name"   className="font-mono text-[12px]">Por jogador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ===== RBAC DENY ===== */}
        {!permissionsLoading && !permissionsError && !rbacAllowed ? (
          <div className="rounded-xl p-4" style={{ border: `1px solid ${DT.bdr}` }}>
            <p className="text-sm font-medium" style={{ color: DT.fg }}>Sem permissão</p>
            <p className="text-xs mt-1" style={{ color: DT.muted }}>Você não tem acesso ao monitor de metas.</p>
          </div>
        ) : (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-5">
            {/* ── CONTENT ──────────────────────────────────────────────── */}
            {isLoading ? (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[300px] rounded-2xl animate-pulse" style={{ background: DT.bg2, border: `1px solid ${DT.bdr}` }} />
                ))}
              </div>
            ) : goalsError ? (
              <div className="rounded-xl p-4" style={{ border: `1px solid ${DT.bdr}` }}>
                <p className="text-sm font-medium" style={{ color: DT.fg }}>Erro ao carregar metas</p>
                <p className="mt-1 text-xs" style={{ color: DT.muted }}>{String(goalsError)}</p>
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Trophy className="w-10 h-10 mx-auto" style={{ color: "rgba(255,255,255,0.08)" }} />
                <p className="font-display font-semibold text-[15px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {searchQuery || goalTypeFilter !== "_all" || statusFilter !== "_all"
                    ? "Nenhum resultado"
                    : "Nenhuma meta criada ainda"}
                </p>
                <p className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.1)" }}>
                  {searchQuery || goalTypeFilter !== "_all" || statusFilter !== "_all"
                    ? "Tente ajustar os filtros"
                    : isPlayerView
                      ? "Clique em + Meta para adicionar"
                      : "Os jogadores podem criar metas no dashboard deles"}
                </p>
                {isPlayerView && filteredGoals.length === 0 && (
                  <button
                    onClick={() => setAddGoalOpen(true)}
                    className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-wide text-white transition-all hover:scale-105"
                    style={{ background: DT.accent }}
                  >
                    + Criar primeira meta
                  </button>
                )}
              </div>
            ) : (
              <GoalsGridView goals={filteredGoals} onGoalClick={setSelectedGoal} />
            )}
          </motion.div>
        )}
      </div>

      {/* Add Goal Dialog — player view only */}
      {isPlayerView && playerIdFilter && (
        <AddGoalDialog
          open={addGoalOpen}
          onOpenChange={setAddGoalOpen}
          playerId={playerIdFilter}
          isGoalkeeper={isGoalkeeper}
          playerPosition={playerProfile?.position ?? ""}
          existingGoalTypes={goalsRaw?.filter(g => g.season_year === new Date().getFullYear()).map(g => g.goal_type) ?? []}
          onSuccess={() => { void queryClient.invalidateQueries({ queryKey: ["admin-metas", playerIdFilter] }); }}
        />
      )}

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
                    src={getOptimizedImageUrl(selectedGoal.player.photo_url, { width: 400, quality: 85, format: "avif" }) || selectedGoal.player.photo_url || ""}
                    alt={selectedGoal.player.full_name}
                    className="w-14 h-14 rounded-full object-cover object-center" width={400} height={400}
                    onError={e => { if (selectedGoal.player.photo_url) (e.target as HTMLImageElement).src = selectedGoal.player.photo_url; }}
                    loading="lazy" decoding="async"
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
    </>
  );
}
