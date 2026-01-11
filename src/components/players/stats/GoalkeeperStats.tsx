import { 
  Shield, 
  Target,
  Footprints,
  AlertTriangle 
} from "lucide-react";
import { StatCard, StatGroup } from "./StatCard";

interface GoalkeeperStatsData {
  // General
  matches: number;
  minutes: number;
  // Goalkeeping
  saves: number;
  saves_inside_box: number;
  penalties_saved: number;
  goals_conceded: number;
  clean_sheets: number;
  errors_leading_to_goal: number;
  // Aerial & Presence
  punches: number;
  successful_runs_out: number;
  total_runs_out: number;
  high_claims: number;
  // Passing
  accurate_passes: number;
  total_passes: number;
  long_passes_accurate: number;
  long_passes_total: number;
  // Additional actions
  clearances: number;
  recoveries: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  // Discipline
  fouls_committed: number;
  yellow_cards: number;
  red_cards: number;
}

interface GoalkeeperStatsProps {
  stats: GoalkeeperStatsData;
}

/**
 * Stats display for goalkeepers (GK)
 * Shows: Defense, Aerial, Passing, Additional Actions, and Discipline stats
 */
export function GoalkeeperStats({ stats }: GoalkeeperStatsProps) {
  // Ensure all values are safe (never undefined/NaN)
  const safe = (val: number | undefined | null): number => 
    typeof val === "number" && !isNaN(val) ? val : 0;

  return (
    <div className="space-y-6">
      {/* A) Goalkeeping Defense */}
      <StatGroup title="Defesa (GK)" icon={<Shield className="w-4 h-4" />}>
        <StatCard 
          label="Jogos" 
          value={safe(stats.matches)} 
          highlight
        />
        <StatCard 
          label="Minutos" 
          value={safe(stats.minutes)} 
        />
        <StatCard 
          label="Defesas Totais" 
          value={safe(stats.saves)} 
          variant="success"
          highlight
        />
        <StatCard 
          label="Defesas na Área" 
          value={safe(stats.saves_inside_box)} 
        />
        <StatCard 
          label="Pênaltis Defendidos" 
          value={safe(stats.penalties_saved)} 
          variant="success"
        />
        <StatCard 
          label="Gols Sofridos" 
          value={safe(stats.goals_conceded)} 
          variant={safe(stats.goals_conceded) > safe(stats.matches) ? "warning" : "default"}
        />
        <StatCard 
          label="Clean Sheets" 
          value={safe(stats.clean_sheets)} 
          variant="success"
        />
        <StatCard 
          label="Erros p/ Gol" 
          value={safe(stats.errors_leading_to_goal)} 
          variant={safe(stats.errors_leading_to_goal) > 0 ? "danger" : "default"}
        />
      </StatGroup>

      {/* B) Aerial Play & Presence */}
      <StatGroup title="Jogo Aéreo e Presença" icon={<Target className="w-4 h-4" />}>
        <StatCard 
          label="Socos" 
          value={safe(stats.punches)} 
        />
        <StatCard 
          label="Saídas" 
          value={safe(stats.successful_runs_out)} 
          total={safe(stats.total_runs_out) || undefined}
          showPercentage={safe(stats.total_runs_out) > 0}
        />
        <StatCard 
          label="Bolas Aéreas Afastadas" 
          value={safe(stats.high_claims)} 
        />
      </StatGroup>

      {/* C) Passing */}
      <StatGroup title="Construção com os Pés" icon={<Footprints className="w-4 h-4" />}>
        <StatCard 
          label="Passes" 
          value={safe(stats.accurate_passes)} 
          total={safe(stats.total_passes) || undefined}
          showPercentage={safe(stats.total_passes) > 0}
        />
        <StatCard 
          label="Passes Longos" 
          value={safe(stats.long_passes_accurate)} 
          total={safe(stats.long_passes_total) || undefined}
          showPercentage={safe(stats.long_passes_total) > 0}
        />
      </StatGroup>

      {/* D) Additional Actions */}
      <StatGroup title="Ações Complementares" icon={<Shield className="w-4 h-4" />}>
        <StatCard 
          label="Cortes" 
          value={safe(stats.clearances)} 
        />
        <StatCard 
          label="Recuperações" 
          value={safe(stats.recoveries)} 
        />
        <StatCard 
          label="Duelos Aéreos" 
          value={safe(stats.aerial_duels_won)} 
          total={safe(stats.aerial_duels_total) || undefined}
          showPercentage={safe(stats.aerial_duels_total) > 0}
        />
      </StatGroup>

      {/* E) Discipline */}
      <StatGroup title="Disciplina" icon={<AlertTriangle className="w-4 h-4" />}>
        <StatCard 
          label="Faltas Cometidas" 
          value={safe(stats.fouls_committed)} 
        />
        <StatCard 
          label="Amarelos" 
          value={safe(stats.yellow_cards)} 
          variant="warning"
        />
        <StatCard 
          label="Vermelhos" 
          value={safe(stats.red_cards)} 
          variant="danger"
        />
      </StatGroup>
    </div>
  );
}
