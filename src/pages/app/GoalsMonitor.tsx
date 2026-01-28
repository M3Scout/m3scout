import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Target, 
  Search, 
  Filter, 
  Loader2, 
  Trophy,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Calendar,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fetchPlayerMatchStatsRaw } from "@/lib/playerMatchStatsProvider";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

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
  yellow_cards_max: { label: "Amarelos", icon: "🟨", color: "yellow", type: "limit", limitLabel: "máx." },
  saves: { label: "Defesas", icon: "🧤", color: "cyan", type: "accumulation" },
  clean_sheets: { label: "Clean Sheets", icon: "🛡️", color: "green", type: "accumulation" },
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

  const { data: playerStats, isLoading: statsLoading, fetchStatus: statsFetchStatus } = useQuery({
    queryKey: ["admin-goals-player-stats", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return {};
      
      const statsMap: Record<string, Record<number, {
        goals: number;
        assists: number;
        matches: number;
        minutes: number;
        shots: number;
        tackles: number;
        yellow_cards: number;
        saves: number;
        clean_sheets: number;
      }>> = {};

      // Fetch stats for each player in parallel
      await Promise.all(playerIds.map(async (playerId) => {
        try {
          const { matchPlayers, matchStats } = await fetchPlayerMatchStatsRaw({ playerId });
          
          // Group by season
          const bySeasonYear: Record<number, typeof matchStats> = {};
          matchPlayers.forEach(mp => {
            if (mp.match?.season_year) {
              if (!bySeasonYear[mp.match.season_year]) {
                bySeasonYear[mp.match.season_year] = [];
              }
            }
          });
          
          matchStats.forEach(stat => {
            const mp = matchPlayers.find(m => m.match_id === stat.match_id);
            if (mp?.match?.season_year) {
              if (!bySeasonYear[mp.match.season_year]) {
                bySeasonYear[mp.match.season_year] = [];
              }
              bySeasonYear[mp.match.season_year].push(stat);
            }
          });

          statsMap[playerId] = {};
          
          Object.entries(bySeasonYear).forEach(([year, stats]) => {
            const seasonYear = Number(year);
            const seasonMatchPlayers = matchPlayers.filter(mp => mp.match?.season_year === seasonYear);
            
            statsMap[playerId][seasonYear] = {
              goals: stats.reduce((sum, s) => sum + (s.goals || 0), 0),
              assists: stats.reduce((sum, s) => sum + (s.assists || 0), 0),
              matches: seasonMatchPlayers.length,
              minutes: seasonMatchPlayers.reduce((sum, mp) => sum + (mp.minutes_played || 0), 0),
              shots: stats.reduce((sum, s) => sum + (s.shots || 0), 0),
              tackles: stats.reduce((sum, s) => sum + (s.tackles || 0), 0),
              yellow_cards: stats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
              saves: stats.reduce((sum, s) => sum + (s.saves || 0), 0),
              clean_sheets: 0, // Would need match-level calculation
            };
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
            <h1 className="text-xl font-semibold">Metas (Monitor)</h1>
            <p className="text-sm text-muted-foreground">Total: {goals.length}</p>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-600/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Metas dos Jogadores</h2>
              <p className="text-xs text-muted-foreground">Monitoramento em tempo real (somente leitura)</p>
            </div>
          </div>

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
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Card className="bg-zinc-900/60 border-zinc-800/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/40 hover:bg-transparent">
                      <TableHead className="text-xs text-zinc-500">Jogador</TableHead>
                      <TableHead className="text-xs text-zinc-500">Meta</TableHead>
                      <TableHead className="text-xs text-zinc-500">Alvo</TableHead>
                      <TableHead className="text-xs text-zinc-500">Temporada</TableHead>
                      <TableHead className="text-xs text-zinc-500 w-[200px]">Progresso</TableHead>
                      <TableHead className="text-xs text-zinc-500">Status</TableHead>
                      <TableHead className="text-xs text-zinc-500">Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGoals.map((goal) => {
                      const config = GOAL_TYPE_CONFIG[goal.goal_type] || {
                        label: goal.goal_type,
                        icon: "🎯",
                        type: "accumulation" as const,
                      };
                      const isLimit = config.type === "limit";

                      return (
                        <TableRow 
                          key={goal.id}
                          className="border-zinc-800/40 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedGoal(goal)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {goal.player?.photo_url ? (
                                <img 
                                  src={goal.player.photo_url} 
                                  alt={goal.player.full_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                  <User className="w-4 h-4 text-zinc-500" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {goal.player?.full_name || "Jogador"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {goal.player?.position}
                                  {goal.player?.age && ` • ${goal.player.age} anos`}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-base">{config.icon}</span>
                              <span className="text-sm text-foreground">{config.label}</span>
                              {isLimit && (
                                <span className="text-[10px] text-zinc-500">({config.limitLabel})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-foreground">
                              {goal.target_value}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{goal.season_year}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {goal.currentValue} / {goal.target_value}
                                </span>
                                <span className="font-medium text-foreground">
                                  {Math.round(goal.percentage)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    getProgressColor(goal.percentage, isLimit)
                                  )}
                                  style={{ width: `${goal.percentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={goal.status} isLimit={isLimit} />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(goal.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredGoals.map((goal) => {
                const config = GOAL_TYPE_CONFIG[goal.goal_type] || {
                  label: goal.goal_type,
                  icon: "🎯",
                  type: "accumulation" as const,
                };
                const isLimit = config.type === "limit";

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-zinc-900/60 border border-zinc-800/40 p-4 space-y-3"
                    onClick={() => setSelectedGoal(goal)}
                  >
                    {/* Player info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {goal.player?.photo_url ? (
                          <img 
                            src={goal.player.photo_url} 
                            alt={goal.player.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-5 h-5 text-zinc-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {goal.player?.full_name || "Jogador"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {goal.player?.position}
                            {goal.player?.age && ` • ${goal.player.age} anos`}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={goal.status} isLimit={isLimit} />
                    </div>

                    {/* Goal info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-foreground">{config.label}</span>
                          {isLimit && (
                            <span className="text-[10px] text-zinc-500 ml-1">({config.limitLabel})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {goal.currentValue} / {goal.target_value}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Temporada {goal.season_year}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            getProgressColor(goal.percentage, isLimit)
                          )}
                          style={{ width: `${goal.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Criada em {format(new Date(goal.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span className="font-medium">{Math.round(goal.percentage)}%</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
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
                    className="w-14 h-14 rounded-full object-cover"
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
