import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCompetitionSelect } from "@/components/ui/searchable-competition-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Loader2,
  BarChart3,
  Save,
  ChevronDown,
  Target,
  AlertTriangle,
  Info,
  Zap,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { safeArray } from "@/lib/utils";
import {
  ScoutCategoryStats,
  OUTFIELD_SCOUT_CATEGORIES,
  GOALKEEPER_SCOUT_CATEGORIES,
  detectStatIncoherences,
  recalcStatTotals,
  type StatValues,
} from "@/components/players/stats/ScoutCategoryStats";
import { clampStatValue, validateSeasonStats, getStatLimit } from "@/lib/statLimits";
import { invalidatePlayerSummary } from "@/lib/playerSummaryCache";

/**
 * Converte um PlayerStat (com possíveis valores "" / null) em um
 * StatValues numérico para alimentar o ScoutCategoryStats.
 */
function statToScoutValues(stat: Record<string, unknown>): StatValues {
  const out: StatValues = {};
  for (const [k, v] of Object.entries(stat)) {
    if (v === "" || v === null || v === undefined) {
      out[k] = 0;
    } else if (typeof v === "number") {
      out[k] = isNaN(v) ? 0 : v;
    } else if (typeof v === "string") {
      const parsed = Number(v);
      out[k] = isNaN(parsed) ? 0 : parsed;
    }
  }
  return out;
}
/** Rótulos amigáveis para os totais usados nos alertas de incoerência. */
const TOTAL_LABEL: Record<string, string> = {
  total_passes: "Passes Totais",
  total_dribbles: "Dribles Totais",
  ground_duels_total: "Duelos no Chão Totais",
  aerial_duels_total: "Duelos Aéreos Totais",
  shots: "Finalizações Totais",
};

/** Stats aggregated from match_player_stats for one (season_year, competition_id) pair. */
interface LiveStatGroup {
  source: "live";
  groupKey: string;
  season_year: number;
  competition_id: string | null;
  competition_name: string | null;
  /** match_player_stats IDs, used for bulk deletion of the stat rows. */
  matchPlayerStatIds: string[];
  /** Distinct match IDs in this group, used to clean up match_players entries. */
  matchIds: string[];
  matches: number;
  minutes: number;
  /** How many of the source matches have status "applied". */
  appliedCount: number;
  // All fields use player_stats column naming so ScoutCategoryStats renders them directly
  goals: number;
  assists: number;
  /** Total shots = off-target + on-target + blocked (player_stats semantics). */
  shots: number;
  shots_on_target: number;
  shots_blocked: number;
  offsides: number;
  accurate_passes: number;
  total_passes: number;
  key_passes: number;
  chances_created: number;
  crosses_success: number;
  crosses_failed: number;
  successful_dribbles: number;
  total_dribbles: number;
  fouls_committed: number;
  fouls_drawn: number;
  possession_lost: number;
  penalties_won: number;
  steals: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  recoveries: number;
  times_dribbled_past: number;
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  goals_conceded: number;
}

/** Convert a LiveStatGroup to the flat StatValues map ScoutCategoryStats expects. */
function liveStatToScoutValues(g: LiveStatGroup): StatValues {
  return {
    goals: g.goals,
    assists: g.assists,
    shots: g.shots,
    shots_on_target: g.shots_on_target,
    shots_blocked: g.shots_blocked,
    offsides: g.offsides,
    accurate_passes: g.accurate_passes,
    total_passes: g.total_passes,
    key_passes: g.key_passes,
    chances_created: g.chances_created,
    crosses_success: g.crosses_success,
    crosses_failed: g.crosses_failed,
    successful_dribbles: g.successful_dribbles,
    total_dribbles: g.total_dribbles,
    fouls_committed: g.fouls_committed,
    fouls_drawn: g.fouls_drawn,
    possession_lost: g.possession_lost,
    penalties_won: g.penalties_won,
    steals: g.steals,
    tackles: g.tackles,
    interceptions: g.interceptions,
    clearances: g.clearances,
    recoveries: g.recoveries,
    times_dribbled_past: g.times_dribbled_past,
    duels_won: g.duels_won,
    total_duels: g.total_duels,
    aerial_duels_won: g.aerial_duels_won,
    aerial_duels_total: g.aerial_duels_total,
    ground_duels_won: g.ground_duels_won,
    ground_duels_total: g.ground_duels_total,
    yellow_cards: g.yellow_cards,
    red_cards: g.red_cards,
    saves: g.saves,
    goals_conceded: g.goals_conceded,
  };
}

interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  final_coefficient: number;
}

// Type for numeric stat fields - can be number, null, or empty string for form handling
type StatValue = number | null | "";

interface PlayerStat {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  is_live_correction?: boolean | null;
  matches: StatValue;
  minutes: StatValue;
  goals: StatValue;
  assists: StatValue;
  yellow_cards: StatValue;
  red_cards: StatValue;
  penalties_won: StatValue;
  steals: StatValue;
  tackles: StatValue;
  interceptions: StatValue;
  recoveries: StatValue;
  // GK specific
  saves: StatValue;
  goals_conceded: StatValue;
  clean_sheets: StatValue;
  penalties_saved: StatValue;
  errors_leading_to_goal: StatValue;
  aerial_duels_won: StatValue;
  aerial_duels_total: StatValue;
  // Passing
  accurate_passes: StatValue;
  total_passes: StatValue;
  // Duels
  duels_won: StatValue;
  total_duels: StatValue;
  ground_duels_won: StatValue;
  ground_duels_total: StatValue;
  // Offensive
  chances_created: StatValue;
  key_passes: StatValue;
  shots: StatValue;
  shots_on_target: StatValue;
  shots_blocked: StatValue;
  // Additional GK
  saves_inside_box: StatValue;
  punches: StatValue;
  high_claims: StatValue;
  successful_runs_out: StatValue;
  total_runs_out: StatValue;
  // Other
  fouls_committed: StatValue;
  fouls_drawn: StatValue;
  offsides: StatValue;
  clearances: StatValue;
  times_dribbled_past: StatValue;
  possession_lost: StatValue;
  long_passes_accurate: StatValue;
  long_passes_total: StatValue;
  successful_dribbles: StatValue;
  total_dribbles: StatValue;
  // Crosses
  crosses_success: StatValue;
  crosses_failed: StatValue;
  // New stats
  progressive_passes: StatValue;
  shots_on_post: StatValue;
}

// Helper to normalize stat value to number for saving.
// When `key` is provided, we also clamp it to the configured min/max
// (see src/lib/statLimits.ts) so we never persist negative or absurd values.
const normalizeStatValue = (value: StatValue, key?: string): number => {
  if (value === null || value === "" || value === undefined) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  const safe = isNaN(num) ? 0 : num;
  return key ? clampStatValue(key, safe) : Math.max(0, safe);
};

const emptyStatRow: Omit<PlayerStat, "id" | "player_id"> = {
  season_year: new Date().getFullYear(),
  competition_id: null,
  matches: "",
  minutes: "",
  goals: "",
  assists: "",
  yellow_cards: "",
  red_cards: "",
  penalties_won: "",
  steals: "",
  tackles: "",
  interceptions: "",
  recoveries: "",
  saves: "",
  goals_conceded: "",
  clean_sheets: "",
  penalties_saved: "",
  errors_leading_to_goal: "",
  aerial_duels_won: "",
  aerial_duels_total: "",
  accurate_passes: "",
  total_passes: "",
  duels_won: "",
  total_duels: "",
  ground_duels_won: "",
  ground_duels_total: "",
  chances_created: "",
  key_passes: "",
  shots: "",
  shots_on_target: "",
  shots_blocked: "",
  saves_inside_box: "",
  punches: "",
  high_claims: "",
  successful_runs_out: "",
  total_runs_out: "",
  fouls_committed: "",
  fouls_drawn: "",
  offsides: "",
  clearances: "",
  times_dribbled_past: "",
  possession_lost: "",
  long_passes_accurate: "",
  long_passes_total: "",
  successful_dribbles: "",
  total_dribbles: "",
  crosses_success: "",
  crosses_failed: "",
  progressive_passes: "",
  shots_on_post: "",
};

interface PlayerStatsFormProps {
  playerId: string;
  playerPosition: string;
}

// Stat input with tooltip - supports empty values for better UX
interface StatInputProps {
  label: string;
  value: StatValue;
  onChange: (value: StatValue) => void;
  tooltip?: string;
  warning?: string;
  min?: number;
  step?: number;
}

function StatInput({ label, value, onChange, tooltip, warning, min = 0, step = 1 }: StatInputProps) {
  // Display empty string when value is null, undefined, or empty string
  const displayValue = value === null || value === undefined || value === "" ? "" : value;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // If empty, keep as empty string (will be normalized to 0 on save)
    if (rawValue === "") {
      onChange("");
      return;
    }
    // Parse the number
    const parsed = step < 1 ? parseFloat(rawValue) : parseInt(rawValue, 10);
    onChange(isNaN(parsed) ? "" : parsed);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input 
        type="number" 
        min={min}
        step={step}
        value={displayValue} 
        onChange={handleChange}
        placeholder="0"
        className={warning ? "border-amber-400" : ""}
      />
      {warning && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </p>
      )}
    </div>
  );
}

// Summary badge component - handles StatValue type
function SummaryBadge({ label, value, highlight = false }: { label: string; value: StatValue; highlight?: boolean }) {
  const displayValue = value === null || value === undefined || value === "" ? 0 : value;
  return (
    <div className={`text-center px-2 py-1 rounded ${highlight ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
      <div className={`text-sm font-semibold ${highlight ? 'text-primary' : ''}`}>{displayValue}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

export function PlayerStatsForm({ playerId, playerPosition }: PlayerStatsFormProps) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [liveStatGroups, setLiveStatGroups] = useState<LiveStatGroup[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingLive, setDeletingLive] = useState<string | null>(null);
  const [liveEdits, setLiveEdits] = useState<Record<string, StatValues>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const isGoalkeeper = playerPosition === "Goleiro" || playerPosition === "GK";
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchData();
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, compRes, liveRes, minutesRes, livePlayersRes] = await Promise.all([
        supabase
          .from("player_stats")
          .select("*")
          .eq("player_id", playerId)
          .order("season_year", { ascending: false }),
        supabase
          .from("competitions")
          .select("id, name, display_name, final_coefficient")
          .eq("is_active", true)
          .order("name"),
        // Fetch all match_player_stats for this player, joined with match metadata
        supabase
          .from("match_player_stats")
          .select(`
            id, player_id, match_id,
            goals, assists, shots, shots_on_target, shots_blocked, offsides,
            passes_completed, passes_total, key_passes, chances_created,
            crosses_success, crosses_failed,
            dribbles_success, dribbles_total,
            fouls_committed, fouls_suffered, possession_lost,
            tackles, interceptions, clearances, recoveries, was_dribbled,
            duels_won, duels_total, aerial_duels_won, aerial_duels_total,
            yellow_cards, red_cards, saves, goals_conceded,
            matches!inner (
              id, season_year, competition_id, status,
              competitions ( id, name, display_name )
            )
          `)
          .eq("player_id", playerId),
        // Fetch minutes_played from match_players
        supabase
          .from("match_players")
          .select("match_id, minutes_played")
          .eq("player_id", playerId),
        // Fetch LIVE participation rows too. A player can still count in public stats
        // even after the match_player_stats row was deleted, because appearances/minutes
        // are derived from match_players.
        supabase
          .from("match_players")
          .select(`
            id, match_id, minutes_played, is_removed,
            matches!inner (
              id, season_year, competition_id, status,
              competitions ( id, name, display_name )
            )
          `)
          .eq("player_id", playerId)
          .neq("is_removed", true),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (compRes.error) throw compRes.error;
      // Live stats errors are non-fatal — show what we have
      if (liveRes.error) console.warn("[PlayerStatsForm] live stats fetch error", liveRes.error);
      if (livePlayersRes.error) console.warn("[PlayerStatsForm] live players fetch error", livePlayersRes.error);

      setStats(statsRes.data || []);
      setCompetitions(compRes.data || []);

      // Build a minutes map: match_id → minutes_played (from match_players, static)
      const minutesMap: Record<string, number> = {};
      for (const mp of minutesRes.data || []) {
        minutesMap[mp.match_id] = mp.minutes_played ?? 0;
      }

      // Override with player_field_presence (authoritative actual minutes, same source
      // as usePlayerMatchStats). This fixes the case where match_players.minutes_played
      // is a stale initial value (e.g. 50 min) but actual presence was 62 min.
      const liveMatchIds = Array.from(new Set(
        (livePlayersRes.data || []).map((r: any) => r.match_id as string)
      ));
      if (liveMatchIds.length > 0) {
        const { data: presenceRows } = await supabase
          .from("player_field_presence")
          .select("match_id, period, entered_at_seconds, exited_at_seconds")
          .eq("player_id", playerId)
          .in("match_id", liveMatchIds);

        if (presenceRows && presenceRows.length > 0) {
          const END_HALF = 45 * 60;
          const presenceMap: Record<string, number> = {};
          for (const r of presenceRows as { match_id: string; period: number | null; entered_at_seconds: number | null; exited_at_seconds: number | null }[]) {
            const period = r.period ?? 1;
            const entryS = r.entered_at_seconds ?? 0;
            const exitS  = Math.min(r.exited_at_seconds ?? END_HALF, END_HALF);
            const entryMin = period === 1 ? Math.floor(entryS / 60) : 45 + Math.floor((entryS - END_HALF) / 60);
            const exitMin  = period === 1 ? Math.floor(exitS  / 60) : 45 + Math.floor((exitS  - END_HALF) / 60);
            presenceMap[r.match_id] = (presenceMap[r.match_id] ?? 0) + Math.max(0, exitMin - entryMin);
          }
          // Presence overrides static match_players.minutes_played
          Object.assign(minutesMap, presenceMap);
        }
      }

      const statsByMatchId: Record<string, any> = {};
      for (const row of (liveRes.data || []) as any[]) {
        statsByMatchId[row.match_id as string] = row;
      }

      // Aggregate LIVE rows by (season_year, competition_id). Use match_players as
      // the source of truth for visibility because appearances/minutes live there.
      const groupMap: Record<string, LiveStatGroup> = {};
      for (const row of (livePlayersRes.data || []) as any[]) {
        const match = row.matches as { id: string; season_year: number; competition_id: string | null; status: "draft" | "live" | "finished" | "applied"; competitions: { id: string; name: string; display_name: string | null } | null } | null;
        if (!match) continue;
        const statRow = (statsByMatchId[row.match_id as string] ?? {}) as any;
        const key = `${match.season_year}_${match.competition_id ?? "none"}`;
        if (!groupMap[key]) {
          const comp = match.competitions;
          groupMap[key] = {
            source: "live",
            groupKey: key,
            season_year: match.season_year,
            competition_id: match.competition_id,
            competition_name: comp ? (comp.display_name || comp.name) : null,
            matchPlayerStatIds: [],
            matchIds: [],
            matches: 0, minutes: 0, appliedCount: 0,
            goals: 0, assists: 0,
            shots: 0, shots_on_target: 0, shots_blocked: 0, offsides: 0,
            accurate_passes: 0, total_passes: 0, key_passes: 0, chances_created: 0,
            crosses_success: 0, crosses_failed: 0,
            successful_dribbles: 0, total_dribbles: 0,
            fouls_committed: 0, fouls_drawn: 0, possession_lost: 0,
            penalties_won: 0, steals: 0, tackles: 0, interceptions: 0, clearances: 0, recoveries: 0, times_dribbled_past: 0,
            duels_won: 0, total_duels: 0,
            aerial_duels_won: 0, aerial_duels_total: 0,
            ground_duels_won: 0, ground_duels_total: 0,
            yellow_cards: 0, red_cards: 0,
            saves: 0, goals_conceded: 0,
          };
        }
        const g = groupMap[key];
        if (statRow.id) g.matchPlayerStatIds.push(statRow.id as string);
        if (!g.matchIds.includes(row.match_id as string)) g.matchIds.push(row.match_id as string);
        if (match.status === "applied") g.appliedCount += 1;
        // minutesMap already has presence-based minutes if available (authoritative),
        // falling back to match_players.minutes_played for matches without presence data.
        const mins = minutesMap[row.match_id as string] ?? row.minutes_played ?? 0;
        if (mins > 0) g.matches += 1;
        g.minutes += mins;
        g.goals += statRow.goals ?? 0;
        g.assists += statRow.assists ?? 0;
        // shots in match_player_stats = off-target only; total = off + on_target + blocked
        const offTarget = statRow.shots ?? 0;
        const onTarget = statRow.shots_on_target ?? 0;
        const blocked = statRow.shots_blocked ?? 0;
        g.shots += offTarget + onTarget + blocked;
        g.shots_on_target += onTarget;
        g.shots_blocked += blocked;
        g.offsides += statRow.offsides ?? 0;
        g.accurate_passes += statRow.passes_completed ?? 0;
        g.total_passes += statRow.passes_total ?? 0;
        g.key_passes += statRow.key_passes ?? 0;
        g.chances_created += statRow.chances_created ?? 0;
        g.crosses_success += statRow.crosses_success ?? 0;
        g.crosses_failed += statRow.crosses_failed ?? 0;
        g.successful_dribbles += statRow.dribbles_success ?? 0;
        g.total_dribbles += statRow.dribbles_total ?? 0;
        g.fouls_committed += statRow.fouls_committed ?? 0;
        g.fouls_drawn += statRow.fouls_suffered ?? 0;
        g.possession_lost += statRow.possession_lost ?? 0;
        g.penalties_won += statRow.penalties_won ?? 0;
        g.steals += statRow.steals ?? 0;
        g.tackles += statRow.tackles ?? 0;
        g.interceptions += statRow.interceptions ?? 0;
        g.clearances += statRow.clearances ?? 0;
        g.recoveries += statRow.recoveries ?? 0;
        g.times_dribbled_past += statRow.was_dribbled ?? 0;
        // duels_won/total in match_player_stats = all duels (ground + aerial combined)
        g.duels_won += statRow.duels_won ?? 0;
        g.total_duels += statRow.duels_total ?? 0;
        g.aerial_duels_won += statRow.aerial_duels_won ?? 0;
        g.aerial_duels_total += statRow.aerial_duels_total ?? 0;
        // Ground duels derived as total − aerial (best approximation available)
        g.ground_duels_won = Math.max(0, g.duels_won - g.aerial_duels_won);
        g.ground_duels_total = Math.max(0, g.total_duels - g.aerial_duels_total);
        g.yellow_cards += statRow.yellow_cards ?? 0;
        g.red_cards += statRow.red_cards ?? 0;
        g.saves += statRow.saves ?? 0;
        g.goals_conceded += statRow.goals_conceded ?? 0;
        g.penalties_won += statRow.penalties_won ?? 0;
      }

      setLiveStatGroups(
        Object.values(groupMap).sort((a, b) => b.season_year - a.season_year),
      );
    } catch (error: any) {
      toast.error("Erro ao carregar estatísticas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addStatRow = () => {
    const newRow: PlayerStat = {
      id: `new-${Date.now()}`,
      player_id: playerId,
      ...emptyStatRow,
    };
    setStats([newRow, ...stats]);
    setExpandedRows(new Set([...expandedRows, newRow.id]));
  };

  const updateStatField = (id: string, field: keyof PlayerStat, value: any) => {
    setStats(currentStats => currentStats.map(s => {
      if (s.id !== id) return s;
      
      const updated = { ...s, [field]: value };
      
      // Auto-correct: shots_on_target > shots → adjust shots
      if (field === "shots_on_target") {
        const shotsOnTarget = normalizeStatValue(value);
        const shots = normalizeStatValue(s.shots);
        if (shotsOnTarget > shots) {
          updated.shots = value;
        }
      }
      
      return updated;
    }));
  };

  const deleteStatRow = async (id: string) => {
    if (id.startsWith("new-")) {
      setStats(stats.filter(s => s.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from("player_stats").delete().eq("id", id);
      if (error) throw error;
      setStats(stats.filter(s => s.id !== id));
      toast.success("Estatística removida");
    } catch (error: any) {
      toast.error("Erro ao remover estatística");
    }
  };

  const STAT_KEYS = [
    "matches", "minutes", "goals", "assists", "yellow_cards", "red_cards",
    "penalties_won", "steals", "tackles", "interceptions", "recoveries", "saves", "goals_conceded",
    "clean_sheets", "penalties_saved", "errors_leading_to_goal",
    "aerial_duels_won", "aerial_duels_total", "accurate_passes", "total_passes",
    "duels_won", "total_duels", "ground_duels_won", "ground_duels_total",
    "chances_created", "key_passes", "shots", "shots_on_target", "shots_blocked",
    "saves_inside_box", "punches", "high_claims", "successful_runs_out",
    "total_runs_out", "fouls_committed", "fouls_drawn", "offsides",
    "clearances", "times_dribbled_past", "possession_lost",
    "long_passes_accurate", "long_passes_total", "successful_dribbles",
    "total_dribbles", "crosses_success", "crosses_failed", "penalties_won",
    "progressive_passes", "shots_on_post",
  ] as const;

  const buildStatPayload = (stat: PlayerStat): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const key of STAT_KEYS) {
      out[key] = normalizeStatValue(stat[key as keyof PlayerStat] as StatValue, key);
    }
    return out;
  };

  const saveStats = async () => {
    // 1) Validate metadata first
    for (const stat of stats) {
      if (!stat.season_year || stat.season_year < 1900) {
        toast.error("Temporada inválida", { description: "Por favor, informe um ano de temporada válido." });
        return;
      }
      if (!stat.competition_id) {
        toast.error("Competição obrigatória", { description: "Por favor, selecione uma competição para cada registro de estatísticas." });
        return;
      }
    }

    // 2) Validate numeric ranges + success/total pairs
    for (const stat of stats) {
      const payload = buildStatPayload(stat);
      const issues = validateSeasonStats(payload);
      if (issues.length > 0) {
        const compName = getCompetitionName(stat.competition_id);
        toast.error(`Valores inválidos em ${compName} (${stat.season_year})`, {
          description: issues.slice(0, 3).map((i) => `• ${i.message}`).join("\n"),
        });
        return;
      }
    }

    setSaving(true);
    try {
      for (const stat of stats) {
        const data = {
          player_id: playerId,
          season_year: stat.season_year,
          competition_id: stat.competition_id,
          ...buildStatPayload(stat),
        };

        if (stat.id.startsWith("new-")) {
          const { error } = await supabase.from("player_stats").insert(data);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("player_stats").update(data).eq("id", stat.id);
          if (error) throw error;
        }
      }

      // Upsert LIVE edits into player_stats as the authoritative correction.
      // The public view (mergeSeasonRows) uses override semantics: when both a
      // LIVE and a MANUAL row exist for the same (year × competition), only the
      // MANUAL row is shown — so there is no double-counting.
      for (const [groupKey, edits] of Object.entries(liveEdits)) {
        if (Object.keys(edits).length === 0) continue;
        const group = liveStatGroups.find(g => g.groupKey === groupKey);
        if (!group) continue;

        const merged = { ...liveStatToScoutValues(group), ...edits };
        const n = (key: string): number => {
          const v = merged[key as keyof typeof merged];
          return typeof v === "number" ? Math.max(0, v) : 0;
        };

        const livePayload = {
          player_id:          playerId,
          season_year:        group.season_year,
          competition_id:     group.competition_id,
          // Flag: this row is a manual correction applied on top of LIVE-aggregated stats.
          // The public stats view will REPLACE the LIVE row with this one (not sum).
          is_live_correction: true,
          matches:            "matches" in edits ? n("matches") : group.matches,
          minutes:            "minutes" in edits ? n("minutes") : group.minutes,
          goals:              n("goals"),
          assists:            n("assists"),
          shots:              n("shots"),
          shots_on_target:    n("shots_on_target"),
          shots_blocked:      n("shots_blocked"),
          shots_on_post:      n("shots_on_post"),
          offsides:           n("offsides"),
          accurate_passes:    n("accurate_passes"),
          total_passes:       n("total_passes"),
          progressive_passes: n("progressive_passes"),
          key_passes:         n("key_passes"),
          chances_created:    n("chances_created"),
          crosses_success:    n("crosses_success"),
          crosses_failed:     n("crosses_failed"),
          successful_dribbles: n("successful_dribbles"),
          total_dribbles:     n("total_dribbles"),
          fouls_committed:    n("fouls_committed"),
          fouls_drawn:        n("fouls_drawn"),
          possession_lost:    n("possession_lost"),
          penalties_won:      n("penalties_won"),
          tackles:            n("tackles"),
          interceptions:      n("interceptions"),
          clearances:         n("clearances"),
          recoveries:         n("recoveries"),
          times_dribbled_past: n("times_dribbled_past"),
          duels_won:          n("aerial_duels_won") + n("ground_duels_won"),
          total_duels:        n("aerial_duels_total") + n("ground_duels_total"),
          aerial_duels_won:   n("aerial_duels_won"),
          aerial_duels_total: n("aerial_duels_total"),
          ground_duels_won:   n("ground_duels_won"),
          ground_duels_total: n("ground_duels_total"),
          yellow_cards:       n("yellow_cards"),
          red_cards:          n("red_cards"),
          saves:              n("saves"),
          goals_conceded:     n("goals_conceded"),
        };

        const { error: liveErr } = await supabase
          .from("player_stats")
          .upsert(livePayload, { onConflict: "player_id,season_year,competition_id" });
        if (liveErr) throw liveErr;
      }

      toast.success("Estatísticas salvas com sucesso!");
      setLiveEdits({});
      invalidatePlayerSummary(playerId);
      // Recalculate attribute scores so radar reflects new/updated stats
      supabase.rpc("recalculate_player_all_attributes", { p_player_id: playerId })
        .then(({ error }) => { if (error) console.warn("[save] recalculate_player_all_attributes failed", error); });
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar estatísticas");
    } finally {
      setSaving(false);
    }
  };

  const updateLiveEdit = (groupKey: string, key: string, value: number) => {
    setLiveEdits(prev => ({
      ...prev,
      [groupKey]: { ...(prev[groupKey] ?? {}), [key]: value },
    }));
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getCompetitionName = (compId: string | null) => {
    if (!compId) return "Sem competição";
    const comp = competitions.find(c => c.id === compId);
    return comp?.display_name || comp?.name || "Desconhecida";
  };

  // Validation warnings
  const getValidationWarnings = (stat: PlayerStat) => {
    const warnings: string[] = [];
    const minutes = normalizeStatValue(stat.minutes);
    const matches = normalizeStatValue(stat.matches);
    const shotsOnTarget = normalizeStatValue(stat.shots_on_target);
    const shots = normalizeStatValue(stat.shots);
    
    if (minutes === 0 && matches > 0) {
      warnings.push("Jogos > 0 mas minutos = 0");
    }
    if (shotsOnTarget > shots) {
      warnings.push("Chutes no gol > chutes totais (ajustado automaticamente)");
    }
    return warnings;
  };

  const allRows = useMemo<(
    | { type: "manual"; stat: PlayerStat }
    | { type: "live"; group: LiveStatGroup; correction: PlayerStat | null }
  )[]>(() => {
    // Build map: groupKey → correction PlayerStat (is_live_correction=true)
    // Only map corrections that have a matching live group; otherwise keep as manual.
    const liveGroupKeys = new Set(liveStatGroups.map(g => g.groupKey));
    const correctionMap = new Map<string, PlayerStat>();
    for (const stat of safeArray(stats)) {
      if (stat.is_live_correction === true && stat.competition_id) {
        const key = `${stat.season_year}_${stat.competition_id}`;
        if (liveGroupKeys.has(key)) correctionMap.set(key, stat);
      }
    }

    const rows: (
      | { type: "manual"; stat: PlayerStat }
      | { type: "live"; group: LiveStatGroup; correction: PlayerStat | null }
    )[] = [
      // Exclude correction rows — they're merged into their live card
      ...safeArray(stats)
        .filter(s => {
          if (!s.is_live_correction) return true;
          const key = `${s.season_year}_${s.competition_id}`;
          return !liveGroupKeys.has(key); // keep if no matching live group
        })
        .map(s => ({ type: "manual" as const, stat: s })),
      ...liveStatGroups.map(g => ({
        type: "live" as const,
        group: g,
        correction: correctionMap.get(g.groupKey) ?? null,
      })),
    ];
    return rows.sort((a, b) => {
      const ya = a.type === "manual" ? a.stat.season_year : a.group.season_year;
      const yb = b.type === "manual" ? b.stat.season_year : b.group.season_year;
      return yb - ya;
    });
  }, [stats, liveStatGroups]);

  const deleteLiveGroup = async (groupKey: string) => {
    const group = liveStatGroups.find(g => g.groupKey === groupKey);
    if (!group) return;

    const isApplied = group.appliedCount > 0;
    const confirmMsg = isApplied
      ? `ATENÇÃO: ${group.appliedCount} partida(s) já aplicada(s) serão removidas. O atleta será retirado desses jogos e os totais serão recalculados.\n\nRemover ${group.matchIds.length} partida(s) de "${group.competition_name ?? "Sem competição"} ${group.season_year}"?`
      : `Remover ${group.matchIds.length} partida(s) de "${group.competition_name ?? "Sem competição"} ${group.season_year}"?`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingLive(groupKey);
    try {
      // 0) Snapshot any existing player_stats records BEFORE the RPC runs.
      //    The RPC deletes them unconditionally; we'll re-insert them afterwards
      //    so that manually-entered (MANUAL) stats survive the LIVE deletion.
      const { data: snapshotRows } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .eq("season_year", group.season_year)
        .eq("competition_id", group.competition_id);

      // 1) Atomic backend cleanup: remove LIVE stat rows, soft-remove match_players,
      // and delete stale player_stats fallback rows for this competition/season.
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
        "remove_player_live_stats_group" as any,
        {
          p_player_id: playerId,
          p_season_year: group.season_year,
          p_competition_id: group.competition_id,
        },
      );
      if (cleanupError) throw cleanupError;
      console.log("[deleteLiveGroup] cleanup result", cleanupResult);

      // 1b) Restore the player_stats records deleted by the RPC.
      //     This preserves manually-entered MANUAL stats that the operator wants
      //     to keep independently of the LIVE data being removed.
      if (snapshotRows && snapshotRows.length > 0) {
        for (const row of snapshotRows) {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rowData } = row as any;
          const { error: reErr } = await supabase.from("player_stats").insert(rowData);
          if (reErr) console.warn("[deleteLiveGroup] re-insert player_stats failed", reErr);
        }
      }

      // 2) Recalculate all derived values when any source match was "applied"
      if (isApplied) {
        const [ratingRes, attrRes, marketRes] = await Promise.allSettled([
          supabase.rpc("update_player_auto_rating", { p_player_id: playerId }),
          supabase.rpc("recalculate_player_all_attributes", { p_player_id: playerId }),
          supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId }),
        ]);
        if (ratingRes.status === "rejected")  console.warn("[deleteLiveGroup] update_player_auto_rating failed", ratingRes.reason);
        if (attrRes.status === "rejected")    console.warn("[deleteLiveGroup] recalculate_player_all_attributes failed", attrRes.reason);
        if (marketRes.status === "rejected")  console.warn("[deleteLiveGroup] recalculate_player_market_value_summary failed", marketRes.reason);
      }

      // 4) Broad cache invalidation — covers all tabs (public + edit)
      invalidatePlayerSummary(playerId);
      // Specific player keys
      queryClient.invalidateQueries({ queryKey: ["player-match-stats", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player-match-stats-by-season-comp", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player-stats", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player-stats-overview", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player-rating-history-overview", playerId] });
      // Broad prefix keys — catch any query that opens from "Visão Geral" / "Estatísticas" tabs
      queryClient.invalidateQueries({ queryKey: ["player-stats"] });
      queryClient.invalidateQueries({ queryKey: ["player_stats"] });
      queryClient.invalidateQueries({ queryKey: ["player-live-stats"] });
      queryClient.invalidateQueries({ queryKey: ["player-details"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      queryClient.invalidateQueries({ queryKey: ["unified-player-stats", playerId] });
      queryClient.invalidateQueries({ queryKey: ["unified-competitions", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player-season-stats", playerId] });

      // 5) Remove from local state (instant UI feedback)
      setLiveStatGroups(prev => prev.filter(g => g.groupKey !== groupKey));

      toast.success(
        isApplied
          ? "Estatísticas removidas e totais recalculados"
          : "Estatísticas ao vivo removidas",
      );
    } catch (error: any) {
      toast.error("Erro ao remover estatísticas ao vivo");
      console.error("[deleteLiveGroup]", error);
    } finally {
      setDeletingLive(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Estatísticas por Temporada
            </CardTitle>
            <CardDescription>
              Gerencie as estatísticas do atleta por competição e temporada
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addStatRow}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
            <Button type="button" size="sm" onClick={saveStats} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {allRows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma estatística registrada</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addStatRow}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar primeira
            </Button>
          </div>
        ) : (
          allRows.map((row) => {
            if (row.type === "live") {
              const group = row.group;
              const correction = row.correction; // PlayerStat with is_live_correction=true, or null
              const rowId = `live-${group.groupKey}`;

              // When a correction exists, display corrected values; fall back to raw live.
              const n = (v: StatValue) => normalizeStatValue(v);
              const dispMatches  = liveEdits[group.groupKey]?.["matches"]  ?? (correction ? n(correction.matches)  : group.matches);
              const dispMinutes  = liveEdits[group.groupKey]?.["minutes"]  ?? (correction ? n(correction.minutes)  : group.minutes);
              const dispGoals    = liveEdits[group.groupKey]?.["goals"]    ?? (correction ? n(correction.goals)    : group.goals);
              const dispAssists  = liveEdits[group.groupKey]?.["assists"]  ?? (correction ? n(correction.assists)  : group.assists);

              // Base values fed into the ScoutCategoryStats editor
              const baseScoutValues = correction
                ? statToScoutValues(correction as unknown as Record<string, unknown>)
                : liveStatToScoutValues(group);

              return (
                <Collapsible key={rowId} open={expandedRows.has(rowId)} onOpenChange={() => toggleRow(rowId)}>
                  <div className={`border rounded-lg ${correction ? "border-amber-500/30" : "border-green-500/30"}`}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4 flex-wrap">
                          {correction ? (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                              <Zap className="w-3 h-3 mr-1" />
                              AO VIVO (Editado)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10">
                              <Zap className="w-3 h-3 mr-1" />
                              AO VIVO
                            </Badge>
                          )}
                          {Object.keys(liveEdits[group.groupKey] ?? {}).length > 0 && (
                            <Badge variant="outline" className="border-amber-500/60 text-amber-400 bg-amber-500/10 text-[10px]">
                              Edições não salvas
                            </Badge>
                          )}
                          {group.appliedCount === group.matchPlayerStatIds.length ? (
                            <Badge variant="outline" className="border-green-600/60 text-green-500 bg-green-500/10 text-[10px]">
                              Aplicado
                            </Badge>
                          ) : group.appliedCount === 0 ? (
                            <Badge variant="outline" className="border-amber-500/60 text-amber-400 bg-amber-500/10 text-[10px]">
                              Aguardando
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/60 text-amber-400 bg-amber-500/10 text-[10px]">
                              {group.appliedCount}/{group.matchPlayerStatIds.length} Aplicado
                            </Badge>
                          )}
                          <Badge variant="outline">{group.season_year}</Badge>
                          <span className="font-medium">{group.competition_name ?? "Sem competição"}</span>
                          <span className="text-sm text-muted-foreground">
                            {dispMatches} jogos • {dispMinutes} min • {dispGoals}G {dispAssists}A
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingLive === group.groupKey}
                            onClick={(e) => { e.stopPropagation(); deleteLiveGroup(group.groupKey); }}
                          >
                            {deletingLive === group.groupKey
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4 text-destructive" />}
                          </Button>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(rowId) ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-0 space-y-4">
                        <Separator />
                        <div className={`rounded-lg p-3 ${correction ? "bg-amber-500/5 border border-amber-500/20" : "bg-green-500/5 border border-green-500/20"}`}>
                          <div className={`text-xs font-medium mb-2 flex items-center gap-1 ${correction ? "text-amber-400" : "text-green-400"}`}>
                            <Zap className="w-3 h-3" />
                            {correction ? "Resumo — Dados Corrigidos" : "Resumo — Dados ao Vivo"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <SummaryBadge label="Jogos"  value={dispMatches} />
                            <SummaryBadge label="Min"    value={dispMinutes} />
                            <SummaryBadge label="Gols"   value={dispGoals}   highlight />
                            <SummaryBadge label="Assist" value={dispAssists} highlight />
                            <SummaryBadge label="Chutes" value={correction ? n(correction.shots)          : group.shots} />
                            <SummaryBadge label="No Gol" value={correction ? n(correction.shots_on_target): group.shots_on_target} />
                            <SummaryBadge label="P.Dec"  value={correction ? n(correction.key_passes)     : group.key_passes} />
                            <SummaryBadge label="Chances" value={correction ? n(correction.chances_created): group.chances_created} />
                            <SummaryBadge label="Amar"   value={correction ? n(correction.yellow_cards)   : group.yellow_cards} />
                            <SummaryBadge label="Verm"   value={correction ? n(correction.red_cards)      : group.red_cards} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <StatInput
                            label="Jogos"
                            value={liveEdits[group.groupKey]?.["matches"] ?? (correction ? n(correction.matches) : group.matches)}
                            onChange={(v) => updateLiveEdit(group.groupKey, "matches", v === "" || v === null ? 0 : Number(v))}
                            tooltip="Total de partidas disputadas nesta competição"
                          />
                          <StatInput
                            label="Minutos"
                            value={liveEdits[group.groupKey]?.["minutes"] ?? (correction ? n(correction.minutes) : group.minutes)}
                            onChange={(v) => updateLiveEdit(group.groupKey, "minutes", v === "" || v === null ? 0 : Number(v))}
                            tooltip="Total de minutos em campo"
                          />
                        </div>
                        <Alert className="border-blue-500/30 bg-blue-500/5">
                          <Info className="h-4 w-4 text-blue-400" />
                          <AlertDescription className="text-blue-300 text-xs">
                            {correction
                              ? "Os valores exibidos são a correção manual salva. Edite abaixo para atualizar a correção."
                              : "Estatísticas geradas pelo sistema Live Match. Você pode editar os valores abaixo manualmente para corrigir eventuais falhas da automação."}
                          </AlertDescription>
                        </Alert>
                        <ScoutCategoryStats
                          mode="edit"
                          categories={isGoalkeeper ? GOALKEEPER_SCOUT_CATEGORIES : OUTFIELD_SCOUT_CATEGORIES}
                          values={{ ...baseScoutValues, ...(liveEdits[group.groupKey] ?? {}) }}
                          onChange={(key, next) => updateLiveEdit(group.groupKey, key, next)}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }

            // Manual stat row
            const stat = row.stat;
            const warnings = getValidationWarnings(stat);

            return (
              <Collapsible
                key={stat.id}
                open={expandedRows.has(stat.id)}
                onOpenChange={() => toggleRow(stat.id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-wrap">
                        <Badge variant="outline">{stat.season_year}</Badge>
                        <span className="font-medium">{getCompetitionName(stat.competition_id)}</span>
                        <span className="text-sm text-muted-foreground">
                          {normalizeStatValue(stat.matches)} jogos • {normalizeStatValue(stat.minutes)} min • {normalizeStatValue(stat.goals)}G {normalizeStatValue(stat.assists)}A
                        </span>
                        {warnings.length > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {warnings.length} aviso(s)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); deleteStatRow(stat.id); }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(stat.id) ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-4 pt-0 space-y-6">
                      <Separator />

                      {/* Validation Warnings */}
                      {warnings.length > 0 && (
                        <Alert variant="default" className="border-amber-300 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800">
                            {warnings.map((w, i) => (
                              <div key={i}>{w}</div>
                            ))}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Quick Summary */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Resumo Automático
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <SummaryBadge label="Jogos" value={stat.matches} />
                          <SummaryBadge label="Min" value={stat.minutes} />
                          <SummaryBadge label="Gols" value={stat.goals} highlight />
                          <SummaryBadge label="Assist" value={stat.assists} highlight />
                          <SummaryBadge label="Chutes" value={stat.shots} />
                          <SummaryBadge label="No Gol" value={stat.shots_on_target} />
                          <SummaryBadge label="P.Dec" value={stat.key_passes} />
                          <SummaryBadge label="Chances" value={stat.chances_created} />
                          <SummaryBadge label="Amar" value={stat.yellow_cards} />
                          <SummaryBadge label="Verm" value={stat.red_cards} />
                        </div>
                      </div>

                      {/* === SEÇÃO: GERAIS === */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          Gerais
                        </div>
                        <p className="text-xs text-muted-foreground -mt-2">Informações básicas da temporada/competição</p>

                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Temporada</Label>
                            <Input
                              type="number"
                              value={stat.season_year}
                              onChange={(e) => updateStatField(stat.id, "season_year", parseInt(e.target.value) || new Date().getFullYear())}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-3">
                            <Label className="text-xs text-muted-foreground">Competição *</Label>
                            <SearchableCompetitionSelect
                              competitions={safeArray(competitions)}
                              value={stat.competition_id || ""}
                              onValueChange={(val) => updateStatField(stat.id, "competition_id", val || null)}
                              placeholder="Selecione uma competição..."
                              triggerClassName={!stat.competition_id ? "border-destructive/50" : ""}
                              renderLabel={(c) => `${c.display_name || c.name} (coef: ${c.final_coefficient})`}
                            />
                            {!stat.competition_id && (
                              <p className="text-xs text-destructive">Competição é obrigatória</p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                          <StatInput
                            label="Jogos"
                            value={stat.matches}
                            onChange={(v) => updateStatField(stat.id, "matches", v)}
                            tooltip="Total de partidas disputadas"
                          />
                          <StatInput
                            label="Minutos"
                            value={stat.minutes}
                            onChange={(v) => updateStatField(stat.id, "minutes", v)}
                            tooltip="Total de minutos em campo"
                            warning={normalizeStatValue(stat.minutes) === 0 && normalizeStatValue(stat.matches) > 0 ? "Sem minutos registrados" : undefined}
                          />
                        </div>
                      </div>

                      {/* === SCOUT CATEGORIES (mesmo layout do Live Match) === */}
                      {(() => {
                        const scoutValues = statToScoutValues(stat as unknown as Record<string, unknown>);
                        const incoherences = detectStatIncoherences(scoutValues);
                        return (
                          <>
                            {incoherences.length > 0 && (
                              <Alert variant="default" className="border-amber-300 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800">
                                  <div className="flex flex-col gap-2">
                                    <div>
                                      <strong>Totais incoerentes detectados</strong> — a soma dos acertos é maior que o total registrado:
                                      <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                                        {incoherences.map((inc) => (
                                          <li key={inc.totalKey}>
                                            <code>{TOTAL_LABEL[inc.totalKey] ?? inc.totalKey}</code>:
                                            registrado <strong>{inc.totalValue}</strong>, soma dos acertos <strong>{inc.componentsSum}</strong>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="border-amber-400 text-amber-900 hover:bg-amber-100"
                                        onClick={() => {
                                          const patch = recalcStatTotals(scoutValues);
                                          for (const [k, v] of Object.entries(patch)) {
                                            updateStatField(stat.id, k as keyof PlayerStat, v);
                                          }
                                          toast.success("Totais recalculados automaticamente");
                                        }}
                                      >
                                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                                        Recalcular totais ({incoherences.length})
                                      </Button>
                                    </div>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                            <ScoutCategoryStats
                              mode="edit"
                              categories={isGoalkeeper ? GOALKEEPER_SCOUT_CATEGORIES : OUTFIELD_SCOUT_CATEGORIES}
                              values={scoutValues}
                              onChange={(key, next) => updateStatField(stat.id, key as keyof PlayerStat, next)}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}

        {(safeArray(stats).length > 0 || Object.keys(liveEdits).length > 0) && (
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={saveStats} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Todas as Estatísticas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
