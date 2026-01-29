import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Target, 
  Footprints, 
  Shield, 
  Crosshair,
  AlertTriangle,
  Sparkles,
  Zap
} from "lucide-react";
import { isGoalkeeper } from "@/lib/positionUtils";
import type { PlayerStats } from "@/lib/playerStats";
import { normalizePlayerStats, calculatePercentage, type NormalizedPlayerStats } from "@/lib/normalizePlayerStats";

interface StatChipProps {
  label: string;
  value: number | string;
  highlight?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}

function StatChip({ label, value, highlight = false, variant = "default" }: StatChipProps) {
  const variantStyles = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
  };

  return (
    <div 
      className={`text-center px-3 py-2 rounded-lg transition-colors ${
        highlight 
          ? 'bg-blue-500/10 border border-blue-500/20' 
          : variantStyles[variant]
      }`}
    >
      <div className={`text-base font-bold tabular-nums ${highlight ? 'text-blue-600' : ''}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

interface StatSectionProps {
  title: string;
  icon: React.ReactNode;
  iconColor?: string;
  children: React.ReactNode;
}

function StatSection({ title, icon, iconColor = "text-muted-foreground", children }: StatSectionProps) {
  return (
    <div className="space-y-2 w-full max-w-full min-w-0 overflow-hidden">
      <div className={`flex items-center gap-2 text-xs font-medium ${iconColor}`}>
        {icon}
        <span className="uppercase tracking-wide">{title}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 w-full max-w-full">
        {children}
      </div>
    </div>
  );
}

interface CompetitionStatsSummaryProps {
  stats: PlayerStats;
  playerPosition?: string;
  competitionName?: string;
  compact?: boolean;
}

/**
 * Read-only display of complete player statistics for a competition/season
 * Shows all available stats in a chip-based layout
 * 
 * REGRA MATEMÁTICA ÚNICA:
 * - total = success + failed
 * - percentage = (success / total) * 100, capped at 100%
 */
export function CompetitionStatsSummary({ 
  stats: rawStats, 
  playerPosition = "",
  competitionName,
  compact = false 
}: CompetitionStatsSummaryProps) {
  const isGK = isGoalkeeper(playerPosition);
  
  // CRITICAL: Normalize stats to ensure consistency (total = success + failed)
  const stats = normalizePlayerStats(rawStats);
  
  // Safe number helper
  const safe = (val: number | undefined | null): number => 
    typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;

  // Calculate percentages using centralized function (NEVER > 100%)
  const passAccuracy = calculatePercentage(safe(stats.accurate_passes), stats.passes_total_derived);
  const shotAccuracy = calculatePercentage(safe(stats.shots_on_target), stats.shots_total_derived);
  const dribbleSuccess = calculatePercentage(safe(stats.successful_dribbles), stats.dribbles_total_derived);
  const groundDuelSuccess = calculatePercentage(safe(stats.ground_duels_won), stats.ground_duels_total_derived);
  const aerialDuelSuccess = calculatePercentage(safe(stats.aerial_duels_won), stats.aerial_duels_total_derived);
  
  // Crosses percentage using centralized function
  const crossesTotal = stats.crosses_total;
  const crossesSuccess = calculatePercentage(safe(stats.crosses_success), crossesTotal);

  // GK specific
  const savePct = calculatePercentage(safe(stats.saves), safe(stats.saves) + safe(stats.goals_conceded));

  if (compact) {
    // Quick summary chips
    return (
      <div className="bg-muted/30 rounded-lg p-3 w-full max-w-full min-w-0 overflow-hidden">
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Estatísticas Completas
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full max-w-full">
          <StatChip label="Jogos" value={safe(stats.matches)} />
          <StatChip label="Min" value={safe(stats.minutes)} />
          {isGK ? (
            <>
              <StatChip label="Defesas" value={safe(stats.saves)} highlight />
              <StatChip label="% Def" value={`${savePct}%`} />
              <StatChip label="GS" value={safe(stats.goals_conceded)} />
              <StatChip label="CS" value={safe(stats.clean_sheets)} variant="success" />
              <StatChip label="Pên Def" value={safe(stats.penalties_saved)} />
              <StatChip label="Erros" value={safe(stats.errors_leading_to_goal)} variant={safe(stats.errors_leading_to_goal) > 0 ? "danger" : "default"} />
            </>
          ) : (
            <>
              <StatChip label="Gols" value={safe(stats.goals)} highlight />
              <StatChip label="Assist" value={safe(stats.assists)} highlight />
              <StatChip label="Final" value={safe(stats.shots)} />
              <StatChip label="No Gol" value={safe(stats.shots_on_target)} />
              <StatChip label="% Final" value={`${shotAccuracy}%`} />
              <StatChip label="P.Dec" value={safe(stats.key_passes)} />
              <StatChip label="Chances" value={safe(stats.chances_created)} />
              <StatChip label="Dribles" value={`${safe(stats.successful_dribbles)}/${safe(stats.total_dribbles)}`} />
              <StatChip label="Desarmes" value={safe(stats.tackles)} />
              <StatChip label="Intercept" value={safe(stats.interceptions)} />
              <StatChip label="Recup" value={safe(stats.recoveries)} />
              <StatChip label="Amar" value={safe(stats.yellow_cards)} variant={safe(stats.yellow_cards) > 5 ? "warning" : "default"} />
              <StatChip label="Verm" value={safe(stats.red_cards)} variant={safe(stats.red_cards) > 0 ? "danger" : "default"} />
            </>
          )}
        </div>
      </div>
    );
  }

  // Full display
  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header with competition badge */}
      {competitionName && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{competitionName}</Badge>
          <Badge variant="outline">{stats.season_year}</Badge>
        </div>
      )}

      {isGK ? (
        // Goalkeeper Stats
        <>
          {/* GK Defense */}
          <StatSection title="Defesa (GK)" icon={<Shield className="w-4 h-4" />} iconColor="text-blue-500">
            <StatChip label="Jogos" value={safe(stats.matches)} highlight />
            <StatChip label="Minutos" value={safe(stats.minutes)} />
            <StatChip label="Defesas" value={safe(stats.saves)} variant="success" />
            <StatChip label="% Defesas" value={`${savePct}%`} />
            <StatChip label="Def na Área" value={safe(stats.saves_inside_box)} />
            <StatChip label="Gols Sofr" value={safe(stats.goals_conceded)} />
            <StatChip label="Clean Sheets" value={safe(stats.clean_sheets)} variant="success" />
            <StatChip label="Pên Defend" value={safe(stats.penalties_saved)} variant="success" />
            <StatChip label="Erros p/ Gol" value={safe(stats.errors_leading_to_goal)} variant={safe(stats.errors_leading_to_goal) > 0 ? "danger" : "default"} />
          </StatSection>

          {/* GK Aerial */}
          <StatSection title="Jogo Aéreo" icon={<Target className="w-4 h-4" />} iconColor="text-purple-500">
            <StatChip label="Socos" value={safe(stats.punches)} />
            <StatChip label="High Claims" value={safe(stats.high_claims)} />
            <StatChip label="Duelos Aér" value={`${safe(stats.aerial_duels_won)}/${safe(stats.aerial_duels_total)}`} />
            <StatChip label="Saídas Gol" value={`${safe(stats.successful_runs_out)}/${safe(stats.total_runs_out)}`} />
          </StatSection>

          {/* GK Passing */}
          <StatSection title="Passes" icon={<Footprints className="w-4 h-4" />} iconColor="text-green-500">
            <StatChip label="Passes" value={`${safe(stats.accurate_passes)}/${safe(stats.total_passes)}`} />
            <StatChip label="% Passes" value={`${passAccuracy}%`} />
            <StatChip label="Pass Long" value={`${safe(stats.long_passes_accurate)}/${safe(stats.long_passes_total)}`} />
          </StatSection>

          {/* GK Additional */}
          <StatSection title="Ações Complementares" icon={<Shield className="w-4 h-4" />}>
            <StatChip label="Cortes" value={safe(stats.clearances)} />
            <StatChip label="Recuperações" value={safe(stats.recoveries)} />
          </StatSection>

          {/* GK Discipline */}
          <StatSection title="Disciplina" icon={<AlertTriangle className="w-4 h-4" />} iconColor="text-amber-500">
            <StatChip label="Faltas" value={safe(stats.fouls_committed)} />
            <StatChip label="Amarelos" value={safe(stats.yellow_cards)} variant={safe(stats.yellow_cards) > 3 ? "warning" : "default"} />
            <StatChip label="Vermelhos" value={safe(stats.red_cards)} variant={safe(stats.red_cards) > 0 ? "danger" : "default"} />
          </StatSection>
        </>
      ) : (
        // Outfield Player Stats
        <>
          {/* Attack / Finalizações - Using normalized totals */}
          <StatSection title="Ataque / Finalizações" icon={<Crosshair className="w-4 h-4" />} iconColor="text-orange-500">
            <StatChip label="Jogos" value={safe(stats.matches)} highlight />
            <StatChip label="Minutos" value={safe(stats.minutes)} />
            <StatChip label="Gols" value={safe(stats.goals)} variant="success" />
            <StatChip label="Assistências" value={safe(stats.assists)} variant="success" />
            {/* CRITICAL: Use shots_total_derived to ensure total >= on_target + blocked */}
            <StatChip label="Finalizações" value={stats.shots_total_derived} />
            <StatChip label="No Gol" value={safe(stats.shots_on_target)} />
            {/* Use derived shots_off_target for consistency */}
            <StatChip label="Fora" value={stats.shots_off_target} />
            <StatChip label="Bloqueadas" value={safe(stats.shots_blocked)} />
            <StatChip label="% Precisão" value={`${shotAccuracy}%`} />
            <StatChip label="Impedimentos" value={safe(stats.offsides)} />
          </StatSection>

          {/* Creativity */}
          <StatSection title="Criatividade" icon={<Sparkles className="w-4 h-4" />} iconColor="text-purple-500">
            <StatChip label="Passes Dec" value={safe(stats.key_passes)} highlight />
            <StatChip label="Chances" value={safe(stats.chances_created)} highlight />
            <StatChip label="Ações c/ Bola" value={safe(stats.ball_actions)} />
            <StatChip label="Dribles" value={`${safe(stats.successful_dribbles)}/${stats.dribbles_total_derived}`} />
            <StatChip label="% Dribles" value={`${dribbleSuccess}%`} />
          </StatSection>

          {/* Passing - REGRA: total = success + failed */}
          <StatSection title="Passe" icon={<Footprints className="w-4 h-4" />} iconColor="text-green-500">
            <StatChip label="Passes" value={`${safe(stats.accurate_passes)}/${stats.passes_total_derived}`} />
            <StatChip label="% Passes" value={`${passAccuracy}%`} />
            <StatChip label="Cruzamentos" value={`${safe(stats.crosses_success)}/${crossesTotal}`} />
            <StatChip label="% Cruzamentos" value={`${crossesSuccess}%`} />
          </StatSection>

          {/* Defense */}
          <StatSection title="Defesa" icon={<Shield className="w-4 h-4" />} iconColor="text-blue-500">
            <StatChip label="Desarmes" value={safe(stats.tackles)} />
            <StatChip label="Intercept" value={safe(stats.interceptions)} />
            <StatChip label="Recuper" value={safe(stats.recoveries)} />
            <StatChip label="Cortes" value={safe(stats.clearances)} />
            <StatChip label="Chutes Bloq" value={safe(stats.blocked_shots)} />
            <StatChip label="Driblado" value={safe(stats.was_dribbled)} />
          </StatSection>

          {/* Duels - REGRA: total = won + lost */}
          <StatSection title="Duelos" icon={<Target className="w-4 h-4" />} iconColor="text-cyan-500">
            <StatChip label="Duelos Chão" value={`${safe(stats.ground_duels_won)}/${stats.ground_duels_total_derived}`} />
            <StatChip label="% Chão" value={`${groundDuelSuccess}%`} />
            <StatChip label="Duelos Aér" value={`${safe(stats.aerial_duels_won)}/${stats.aerial_duels_total_derived}`} />
            <StatChip label="% Aéreo" value={`${aerialDuelSuccess}%`} />
            <StatChip label="Driblado" value={safe(stats.times_dribbled_past)} />
          </StatSection>

          {/* Discipline */}
          <StatSection title="Disciplina" icon={<AlertTriangle className="w-4 h-4" />} iconColor="text-amber-500">
            <StatChip label="Faltas Sofr" value={safe(stats.fouls_drawn)} />
            <StatChip label="Faltas Com" value={safe(stats.fouls_committed)} />
            <StatChip label="Perda Posse" value={safe(stats.possession_lost)} />
            <StatChip label="Amarelos" value={safe(stats.yellow_cards)} variant={safe(stats.yellow_cards) > 5 ? "warning" : "default"} />
            <StatChip label="Vermelhos" value={safe(stats.red_cards)} variant={safe(stats.red_cards) > 0 ? "danger" : "default"} />
          </StatSection>
        </>
      )}
    </div>
  );
}
