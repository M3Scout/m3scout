/**
 * Goalkeeper Stats Section with Filters
 * 
 * Displays detailed goalkeeper statistics with year/competition filters
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Target,
  Footprints,
  AlertTriangle,
  Loader2,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GKStatsRow {
  id: string;
  season_year: number;
  competition_id: string | null;
  matches: number;
  minutes: number;
  saves: number;
  saves_inside_box: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  shots_on_target_against: number;
  penalty_faced: number;
  claims: number;
  punches: number;
  high_claims: number;
  crosses_faced: number;
  crosses_stopped: number;
  successful_runs_out: number;
  total_runs_out: number;
  accurate_passes: number;
  total_passes: number;
  long_passes_accurate: number;
  long_passes_total: number;
  errors_leading_to_goal: number;
  errors_leading_to_shot: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  competitions?: { name: string } | null;
}

interface GoalkeeperStatsSectionProps {
  playerId: string;
}

// Safe value helper
const safe = (val: number | undefined | null): number | null =>
  typeof val === "number" && !isNaN(val) ? val : null;

// Display value with fallback
const display = (val: number | null): string => (val !== null ? val.toString() : "—");

// Calculate percentage
const pct = (num: number | null, denom: number | null): string => {
  if (num === null || denom === null || denom === 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
};

// Calculate per 90
const per90 = (stat: number | null, minutes: number | null): string => {
  if (stat === null || minutes === null || minutes === 0) return "—";
  return ((stat / minutes) * 90).toFixed(1);
};

// Stat item component
function StatItem({
  label,
  value,
  subValue,
  variant = "default",
}: {
  label: string;
  value: string;
  subValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
        <span className={`font-medium ${variantStyles[variant]}`}>{value}</span>
      </div>
    </div>
  );
}

// Stats block component
function StatsBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// Aggregate stats helper
function aggregateStats(rows: GKStatsRow[]): GKStatsRow {
  return rows.reduce(
    (acc, row) => ({
      ...acc,
      matches: acc.matches + (row.matches || 0),
      minutes: acc.minutes + (row.minutes || 0),
      saves: acc.saves + (row.saves || 0),
      saves_inside_box: acc.saves_inside_box + (row.saves_inside_box || 0),
      goals_conceded: acc.goals_conceded + (row.goals_conceded || 0),
      clean_sheets: acc.clean_sheets + (row.clean_sheets || 0),
      penalties_saved: acc.penalties_saved + (row.penalties_saved || 0),
      shots_on_target_against: acc.shots_on_target_against + (row.shots_on_target_against || 0),
      penalty_faced: acc.penalty_faced + (row.penalty_faced || 0),
      claims: acc.claims + (row.claims || 0),
      punches: acc.punches + (row.punches || 0),
      high_claims: acc.high_claims + (row.high_claims || 0),
      crosses_faced: acc.crosses_faced + (row.crosses_faced || 0),
      crosses_stopped: acc.crosses_stopped + (row.crosses_stopped || 0),
      successful_runs_out: acc.successful_runs_out + (row.successful_runs_out || 0),
      total_runs_out: acc.total_runs_out + (row.total_runs_out || 0),
      accurate_passes: acc.accurate_passes + (row.accurate_passes || 0),
      total_passes: acc.total_passes + (row.total_passes || 0),
      long_passes_accurate: acc.long_passes_accurate + (row.long_passes_accurate || 0),
      long_passes_total: acc.long_passes_total + (row.long_passes_total || 0),
      errors_leading_to_goal: acc.errors_leading_to_goal + (row.errors_leading_to_goal || 0),
      errors_leading_to_shot: acc.errors_leading_to_shot + (row.errors_leading_to_shot || 0),
      yellow_cards: acc.yellow_cards + (row.yellow_cards || 0),
      red_cards: acc.red_cards + (row.red_cards || 0),
      fouls_committed: acc.fouls_committed + (row.fouls_committed || 0),
    }),
    {
      id: "",
      season_year: 0,
      competition_id: null,
      matches: 0,
      minutes: 0,
      saves: 0,
      saves_inside_box: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
      shots_on_target_against: 0,
      penalty_faced: 0,
      claims: 0,
      punches: 0,
      high_claims: 0,
      crosses_faced: 0,
      crosses_stopped: 0,
      successful_runs_out: 0,
      total_runs_out: 0,
      accurate_passes: 0,
      total_passes: 0,
      long_passes_accurate: 0,
      long_passes_total: 0,
      errors_leading_to_goal: 0,
      errors_leading_to_shot: 0,
      yellow_cards: 0,
      red_cards: 0,
      fouls_committed: 0,
    } as GKStatsRow
  );
}

export function GoalkeeperStatsSection({ playerId }: GoalkeeperStatsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GKStatsRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<string>("all");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("player_stats")
          .select("*, competitions(name)")
          .eq("player_id", playerId)
          .order("season_year", { ascending: false });

        if (error) throw error;
        setStats((data || []) as GKStatsRow[]);
      } catch (err) {
        console.error("Error fetching GK stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [playerId]);

  // Year options
  const yearOptions = useMemo(() => {
    const years = [...new Set(stats.map((s) => s.season_year))].sort((a, b) => b - a);
    return [{ value: "all", label: "Todos os anos" }, ...years.map((y) => ({ value: String(y), label: String(y) }))];
  }, [stats]);

  // Competition options (filtered by year)
  const competitionOptions = useMemo(() => {
    let filtered = stats;
    if (selectedYear !== "all") {
      filtered = stats.filter((s) => String(s.season_year) === selectedYear);
    }
    const comps = new Map<string, string>();
    filtered.forEach((s) => {
      if (s.competition_id && s.competitions?.name) {
        comps.set(s.competition_id, s.competitions.name);
      }
    });
    return [
      { value: "all", label: "Todas competições" },
      ...Array.from(comps.entries()).map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [stats, selectedYear]);

  // Filtered and aggregated stats
  const displayStats = useMemo(() => {
    let filtered = stats;
    if (selectedYear !== "all") {
      filtered = filtered.filter((s) => String(s.season_year) === selectedYear);
    }
    if (selectedCompetition !== "all") {
      filtered = filtered.filter((s) => s.competition_id === selectedCompetition);
    }
    if (filtered.length === 0) return null;
    return aggregateStats(filtered);
  }, [stats, selectedYear, selectedCompetition]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma estatística de goleiro encontrada</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Adicione estatísticas na aba de estatísticas por temporada
          </p>
        </CardContent>
      </Card>
    );
  }

  const s = displayStats;
  if (!s) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum dado para o filtro selecionado</p>
        </CardContent>
      </Card>
    );
  }

  const matches = safe(s.matches);
  const minutes = safe(s.minutes);
  const saves = safe(s.saves);
  const goalsConc = safe(s.goals_conceded);
  const cleanSheets = safe(s.clean_sheets);
  const shotsAgainst = safe(s.shots_on_target_against);
  const penaltiesSaved = safe(s.penalties_saved);
  const penaltiesFaced = safe(s.penalty_faced);
  const claims = safe(s.claims);
  const punches = safe(s.punches);
  const highClaims = safe(s.high_claims);
  const crossesFaced = safe(s.crosses_faced);
  const crossesStopped = safe(s.crosses_stopped);
  const successfulRunsOut = safe(s.successful_runs_out);
  const totalRunsOut = safe(s.total_runs_out);
  const accuratePasses = safe(s.accurate_passes);
  const totalPasses = safe(s.total_passes);
  const longPassesAcc = safe(s.long_passes_accurate);
  const longPassesTotal = safe(s.long_passes_total);
  const errorsGoal = safe(s.errors_leading_to_goal);
  const errorsShot = safe(s.errors_leading_to_shot);
  const yellowCards = safe(s.yellow_cards);
  const redCards = safe(s.red_cards);
  const fouls = safe(s.fouls_committed);

  const savePctValue =
    shotsAgainst !== null && shotsAgainst > 0
      ? pct(saves, shotsAgainst)
      : saves !== null && goalsConc !== null && saves + goalsConc > 0
      ? pct(saves, saves + goalsConc)
      : "—";

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Estatísticas de Goleiro
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={selectedYear}
                onValueChange={(v) => {
                  setSelectedYear(v);
                  setSelectedCompetition("all");
                }}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {competitionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">{display(matches)} jogos</Badge>
            <Badge variant="outline">{display(minutes)} minutos</Badge>
            {selectedYear !== "all" && <Badge variant="secondary">{selectedYear}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Block 1: Defesas */}
        <StatsBlock title="Defesas" icon={<Shield className="w-4 h-4 text-primary" />}>
          <StatItem
            label="Defesas (total)"
            value={display(saves)}
            variant={saves !== null && saves > 0 ? "success" : "default"}
          />
          <StatItem label="Chutes no alvo sofridos" value={display(shotsAgainst)} />
          <StatItem label="% Defesas (Save %)" value={savePctValue} variant="success" />
          <StatItem label="Defesas por 90" value={per90(saves, minutes)} />
          <StatItem
            label="Gols sofridos por 90"
            value={per90(goalsConc, minutes)}
            variant={goalsConc !== null && minutes !== null && (goalsConc / (minutes / 90)) > 1.5 ? "warning" : "default"}
          />
          <StatItem
            label="Clean Sheets"
            value={display(cleanSheets)}
            subValue={matches !== null && cleanSheets !== null ? `(${pct(cleanSheets, matches)})` : undefined}
            variant="success"
          />
          <StatItem
            label="Pênaltis defendidos"
            value={penaltiesSaved !== null && penaltiesFaced !== null ? `${penaltiesSaved}/${penaltiesFaced}` : display(penaltiesSaved)}
          />
        </StatsBlock>

        {/* Block 2: Área / Aéreo */}
        <StatsBlock title="Área / Aéreo" icon={<Target className="w-4 h-4 text-primary" />}>
          <StatItem label="Saídas (Claims)" value={display(claims)} />
          <StatItem label="Socos (Punches)" value={display(punches)} />
          <StatItem label="Bolas aéreas (High Claims)" value={display(highClaims)} />
          <StatItem label="Cruzamentos enfrentados" value={display(crossesFaced)} />
          <StatItem
            label="Cruzamentos interceptados"
            value={display(crossesStopped)}
            subValue={crossesFaced !== null && crossesStopped !== null ? `(${pct(crossesStopped, crossesFaced)})` : undefined}
          />
          <StatItem
            label="Saídas do gol"
            value={successfulRunsOut !== null && totalRunsOut !== null ? `${successfulRunsOut}/${totalRunsOut}` : display(successfulRunsOut)}
            subValue={totalRunsOut !== null && successfulRunsOut !== null ? `(${pct(successfulRunsOut, totalRunsOut)})` : undefined}
          />
        </StatsBlock>

        {/* Block 3: Distribuição */}
        <StatsBlock title="Distribuição" icon={<Footprints className="w-4 h-4 text-primary" />}>
          <StatItem label="Passes tentados" value={display(totalPasses)} />
          <StatItem
            label="% Passes certos"
            value={pct(accuratePasses, totalPasses)}
            variant={accuratePasses !== null && totalPasses !== null && accuratePasses / totalPasses > 0.75 ? "success" : "default"}
          />
          <StatItem label="Lançamentos tentados" value={display(longPassesTotal)} />
          <StatItem label="% Lançamentos certos" value={pct(longPassesAcc, longPassesTotal)} />
          <StatItem label="Passes por 90" value={per90(totalPasses, minutes)} />
        </StatsBlock>

        {/* Block 4: Erros / Disciplina */}
        <StatsBlock title="Erros / Disciplina" icon={<AlertTriangle className="w-4 h-4 text-destructive" />}>
          <StatItem
            label="Erros p/ finalização"
            value={display(errorsShot)}
            variant={errorsShot !== null && errorsShot > 0 ? "warning" : "default"}
          />
          <StatItem
            label="Erros p/ gol"
            value={display(errorsGoal)}
            variant={errorsGoal !== null && errorsGoal > 0 ? "danger" : "default"}
          />
          <StatItem
            label="Cartões amarelos"
            value={display(yellowCards)}
            variant={yellowCards !== null && yellowCards > 0 ? "warning" : "default"}
          />
          <StatItem
            label="Cartões vermelhos"
            value={display(redCards)}
            variant={redCards !== null && redCards > 0 ? "danger" : "default"}
          />
          <StatItem label="Faltas cometidas" value={display(fouls)} />
        </StatsBlock>
      </div>
    </div>
  );
}
