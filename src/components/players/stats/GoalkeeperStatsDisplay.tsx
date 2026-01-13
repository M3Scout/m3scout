/**
 * Goalkeeper Stats Display Component
 * 
 * Renders goalkeeper-specific statistics in a structured card layout:
 * - Defesas (Shot stopping)
 * - Área / Aéreo (Aerial presence)
 * - Distribuição (Distribution)
 * - Erros (Errors)
 */

import { 
  Shield, 
  Target,
  Footprints,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GoalkeeperStatsData {
  // General
  matches?: number;
  minutes?: number;
  // Shot stopping
  saves?: number;
  saves_inside_box?: number;
  goals_conceded?: number;
  clean_sheets?: number;
  penalties_saved?: number;
  shots_on_target_against?: number;
  penalty_faced?: number;
  // Aerial
  claims?: number;
  punches?: number;
  high_claims?: number;
  crosses_faced?: number;
  crosses_stopped?: number;
  successful_runs_out?: number;
  total_runs_out?: number;
  // Distribution
  accurate_passes?: number;
  total_passes?: number;
  long_passes_accurate?: number;
  long_passes_total?: number;
  // Errors
  errors_leading_to_goal?: number;
  errors_leading_to_shot?: number;
  // Discipline
  yellow_cards?: number;
  red_cards?: number;
  fouls_committed?: number;
}

interface GoalkeeperStatsDisplayProps {
  stats: GoalkeeperStatsData;
  seasonYear?: number;
  competitionName?: string;
}

// Safe value helper
const safe = (val: number | undefined | null): number | null => 
  typeof val === "number" && !isNaN(val) ? val : null;

// Display value with fallback
const display = (val: number | null): string => val !== null ? val.toString() : "—";

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
  variant = "default" 
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
        {subValue && (
          <span className="text-xs text-muted-foreground">{subValue}</span>
        )}
        <span className={`font-medium ${variantStyles[variant]}`}>{value}</span>
      </div>
    </div>
  );
}

// Stats block component
function StatsBlock({ 
  title, 
  icon, 
  children 
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
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

export function GoalkeeperStatsDisplay({ 
  stats, 
  seasonYear, 
  competitionName 
}: GoalkeeperStatsDisplayProps) {
  const matches = safe(stats.matches);
  const minutes = safe(stats.minutes);
  const saves = safe(stats.saves);
  const goalsConc = safe(stats.goals_conceded);
  const cleanSheets = safe(stats.clean_sheets);
  const shotsAgainst = safe(stats.shots_on_target_against);
  const penaltiesSaved = safe(stats.penalties_saved);
  const penaltiesFaced = safe(stats.penalty_faced);
  const claims = safe(stats.claims);
  const punches = safe(stats.punches);
  const highClaims = safe(stats.high_claims);
  const crossesFaced = safe(stats.crosses_faced);
  const crossesStopped = safe(stats.crosses_stopped);
  const successfulRunsOut = safe(stats.successful_runs_out);
  const totalRunsOut = safe(stats.total_runs_out);
  const accuratePasses = safe(stats.accurate_passes);
  const totalPasses = safe(stats.total_passes);
  const longPassesAcc = safe(stats.long_passes_accurate);
  const longPassesTotal = safe(stats.long_passes_total);
  const errorsGoal = safe(stats.errors_leading_to_goal);
  const errorsShot = safe(stats.errors_leading_to_shot);
  const yellowCards = safe(stats.yellow_cards);
  const redCards = safe(stats.red_cards);
  const fouls = safe(stats.fouls_committed);

  // Calculate save percentage (fallback if shots_on_target_against not available)
  const savePctValue = shotsAgainst !== null && shotsAgainst > 0
    ? pct(saves, shotsAgainst)
    : (saves !== null && goalsConc !== null && (saves + goalsConc) > 0
        ? pct(saves, saves + goalsConc)
        : "—");

  return (
    <div className="space-y-4">
      {/* Header with badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default">Goleiro</Badge>
          {seasonYear && <Badge variant="outline">{seasonYear}</Badge>}
          {competitionName && <Badge variant="secondary">{competitionName}</Badge>}
        </div>
        {matches !== null && minutes !== null && (
          <span className="text-sm text-muted-foreground">
            {display(matches)} jogos • {display(minutes)} min
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Block 1: Defesas */}
        <StatsBlock title="Defesas" icon={<Shield className="w-4 h-4 text-primary" />}>
          <StatItem 
            label="Defesas (total)" 
            value={display(saves)} 
            variant={saves !== null && saves > 0 ? "success" : "default"}
          />
          <StatItem 
            label="Chutes no alvo sofridos" 
            value={display(shotsAgainst)} 
          />
          <StatItem 
            label="% Defesas (Save %)" 
            value={savePctValue}
            variant="success"
          />
          <StatItem 
            label="Defesas por 90" 
            value={per90(saves, minutes)}
          />
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
            value={penaltiesSaved !== null && penaltiesFaced !== null 
              ? `${penaltiesSaved}/${penaltiesFaced}` 
              : display(penaltiesSaved)}
          />
        </StatsBlock>

        {/* Block 2: Área / Aéreo */}
        <StatsBlock title="Área / Aéreo" icon={<Target className="w-4 h-4 text-primary" />}>
          <StatItem 
            label="Saídas (Claims)" 
            value={display(claims)}
          />
          <StatItem 
            label="Socos (Punches)" 
            value={display(punches)}
          />
          <StatItem 
            label="Bolas aéreas (High Claims)" 
            value={display(highClaims)}
          />
          <StatItem 
            label="Cruzamentos enfrentados" 
            value={display(crossesFaced)}
          />
          <StatItem 
            label="Cruzamentos interceptados" 
            value={display(crossesStopped)}
            subValue={crossesFaced !== null && crossesStopped !== null ? `(${pct(crossesStopped, crossesFaced)})` : undefined}
          />
          <StatItem 
            label="Saídas do gol" 
            value={successfulRunsOut !== null && totalRunsOut !== null 
              ? `${successfulRunsOut}/${totalRunsOut}` 
              : display(successfulRunsOut)}
            subValue={totalRunsOut !== null && successfulRunsOut !== null ? `(${pct(successfulRunsOut, totalRunsOut)})` : undefined}
          />
        </StatsBlock>

        {/* Block 3: Distribuição */}
        <StatsBlock title="Distribuição" icon={<Footprints className="w-4 h-4 text-primary" />}>
          <StatItem 
            label="Passes tentados" 
            value={display(totalPasses)}
          />
          <StatItem 
            label="% Passes certos" 
            value={pct(accuratePasses, totalPasses)}
            variant={accuratePasses !== null && totalPasses !== null && (accuratePasses / totalPasses) > 0.75 ? "success" : "default"}
          />
          <StatItem 
            label="Lançamentos tentados" 
            value={display(longPassesTotal)}
          />
          <StatItem 
            label="% Lançamentos certos" 
            value={pct(longPassesAcc, longPassesTotal)}
          />
          <StatItem 
            label="Passes por 90" 
            value={per90(totalPasses, minutes)}
          />
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
          <StatItem 
            label="Faltas cometidas" 
            value={display(fouls)}
          />
        </StatsBlock>
      </div>
    </div>
  );
}
